// Settings modal dialog

import { getLang, setLang, t } from '../i18n.js';
import { clearHistory, clearList, getSettings, updateSettings } from '../store.js';
import { el, openModal, toast } from '../ui.js';

export function openSettingsModal(onChanged) {
  let close = null;

  function buildContent() {
    const s = getSettings();
    const lang = getLang();
    const wrap = el('div');

    wrap.append(el('h2', {}, t('settingsTitle')));

    // Language
    const langChips = el(
      'div',
      { class: 'chips' },
      el(
        'button',
        {
          type: 'button',
          class: `chip${lang === 'en' ? ' active' : ''}`,
          onClick: () => {
            setLang('en');
            refresh();
            onChanged?.();
          },
        },
        'English',
      ),
      el(
        'button',
        {
          type: 'button',
          class: `chip${lang === 'bn' ? ' active' : ''}`,
          onClick: () => {
            setLang('bn');
            refresh();
            onChanged?.();
          },
        },
        'বাংলা',
      ),
    );
    wrap.append(el('div', { class: 'setting' }, el('label', {}, t('settingLang')), langChips));

    // Playback Mode
    const pbOptions = [
      { id: 'auto', label: t('settingPlaybackAuto') },
      { id: 'direct', label: t('settingPlaybackDirect') },
      { id: 'compat', label: t('settingPlaybackCompat') },
    ];
    const pbChips = el(
      'div',
      { class: 'chips' },
      ...pbOptions.map((o) =>
        el(
          'button',
          {
            type: 'button',
            class: `chip${s.playback === o.id ? ' active' : ''}`,
            onClick: () => {
              updateSettings({ playback: o.id });
              refresh();
            },
          },
          o.label,
        ),
      ),
    );
    wrap.append(
      el(
        'div',
        { class: 'setting' },
        el('label', {}, t('settingPlayback')),
        pbChips,
        el('p', {}, t('settingPlaybackHelp')),
      ),
    );

    // Preferred Audio Language
    const audioOpts = [
      { id: 'any', label: t('audioAny') },
      { id: 'hin', label: t('audioHin') },
      { id: 'eng', label: t('audioEng') },
      { id: 'ben', label: t('audioBen') },
    ];
    const audioChips = el(
      'div',
      { class: 'chips' },
      ...audioOpts.map((o) =>
        el(
          'button',
          {
            type: 'button',
            class: `chip${s.prefAudio === o.id ? ' active' : ''}`,
            onClick: () => {
              updateSettings({ prefAudio: o.id });
              refresh();
            },
          },
          o.label,
        ),
      ),
    );
    wrap.append(el('div', { class: 'setting' }, el('label', {}, t('settingPrefAudio')), audioChips));

    // Auto-play next episode
    const apChips = el(
      'div',
      { class: 'chips' },
      el(
        'button',
        {
          type: 'button',
          class: `chip${s.autoplayNext ? ' active' : ''}`,
          onClick: () => {
            updateSettings({ autoplayNext: true });
            refresh();
          },
        },
        t('on'),
      ),
      el(
        'button',
        {
          type: 'button',
          class: `chip${!s.autoplayNext ? ' active' : ''}`,
          onClick: () => {
            updateSettings({ autoplayNext: false });
            refresh();
          },
        },
        t('off'),
      ),
    );
    wrap.append(el('div', { class: 'setting' }, el('label', {}, t('settingAutoplay')), apChips));

    // Local Data
    const dataChips = el(
      'div',
      { class: 'chips' },
      el(
        'button',
        {
          type: 'button',
          class: 'chip',
          onClick: () => {
            clearHistory();
            toast(t('historyCleared'));
            onChanged?.();
          },
        },
        t('clearHistory'),
      ),
      el(
        'button',
        {
          type: 'button',
          class: 'chip',
          onClick: () => {
            clearList();
            toast(t('listCleared'));
            onChanged?.();
          },
        },
        t('clearList'),
      ),
    );
    wrap.append(
      el(
        'div',
        { class: 'setting' },
        el('label', {}, t('settingData')),
        dataChips,
        el('p', {}, t('settingShortcuts')),
      ),
    );

    // Done button
    wrap.append(
      el(
        'div',
        { class: 'modal-actions' },
        el('button', { type: 'button', class: 'btn btn-grad', onClick: () => close?.() }, t('close')),
      ),
    );

    return wrap;
  }

  const host = el('div');
  function refresh() {
    host.innerHTML = '';
    host.append(buildContent());
  }
  refresh();
  close = openModal(host);
}
