/** Favorites: saved colors and white tones as quick picks. */
import { $, haptic, toast } from './dom.js';
import { MAX_FAVORITES } from '../config.js';
import { t } from '../i18n.js';
import { KEYS } from '../storage.js';

/**
 * A favorite: a color, plus the Kelvin value for white tones.
 * @typedef {{ c: string, k: number | null }} Favorite
 */

/**
 * @param {object} deps
 * @param {import('../bluetooth.js').ChainConnection} deps.chain
 * @param {typeof import('../state.js').lightState} deps.state
 * @param {ReturnType<import('../storage.js').createStorage>} deps.storage
 * @param {{ applyColor: (hex: string) => void, applyWhite: (kelvin: number) => void, showTab: (tab: 'white' | 'color') => void }} deps.colors
 */
export function initFavorites({ chain, state, storage, colors }) {
  /** @type {Favorite[]} */
  let favorites = storage.get(KEYS.favorites, []);
  let editing = false;
  const row = $('favs');

  const save = () => storage.set(KEYS.favorites, favorites);

  function render() {
    row.querySelectorAll('.fav:not(.add)').forEach((node) => node.remove());
    favorites.forEach((favorite, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fav';
      button.style.background = favorite.c;
      button.dataset.color = favorite.c;
      button.disabled = !chain.isConnected;
      button.setAttribute(
        'aria-label',
        favorite.k ? t('favorites.itemWhite', { kelvin: favorite.k }) : t('favorites.itemColor'),
      );
      button.innerHTML = '<span class="x" aria-hidden="true">−</span>';
      button.onclick = () => (editing ? remove(index) : choose(favorite));
      row.appendChild(button);
    });
    row.classList.toggle('editing', editing);
    $('favEdit').textContent = t(editing ? 'favorites.done' : 'favorites.edit');
    $('favEdit').hidden = !favorites.length;
    $('favHint').hidden = favorites.length > 0;
    renderSelection(state.get());
  }

  function renderSelection({ color, effect }) {
    row.querySelectorAll('.fav:not(.add)').forEach((button) => {
      button.classList.toggle('sel', effect === null && button.dataset.color === color);
    });
  }

  function choose(favorite) {
    haptic();
    if (favorite.k) {
      colors.showTab('white');
      colors.applyWhite(favorite.k);
    } else {
      colors.showTab('color');
      colors.applyColor(favorite.c);
    }
  }

  function remove(index) {
    favorites.splice(index, 1);
    save();
    if (!favorites.length) editing = false;
    render();
  }

  $('favAdd').onclick = () => {
    const { color, kelvin, effect } = state.get();
    if (effect !== null) return toast(t('favorites.noEffects'));
    if (favorites.some((favorite) => favorite.c === color)) return toast(t('favorites.duplicate'));
    favorites = [{ c: color, k: kelvin }, ...favorites].slice(0, MAX_FAVORITES);
    save();
    haptic();
    render();
    toast(t('favorites.saved'));
  };
  $('favEdit').onclick = () => {
    editing = !editing;
    render();
  };

  state.subscribe(renderSelection);
  render();
}
