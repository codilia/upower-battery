import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class UpowerBatteryPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window._settings = this.getSettings();
        this._window = window;
        this._general();
    }

    _general() {
        const generalPage = new Adw.PreferencesPage();
        this._window.add(generalPage);

        const settingsGroup = new Adw.PreferencesGroup({
            title: _('Settings'),
        });
        generalPage.add(settingsGroup);

        const panelPositions = new Gtk.StringList()
        panelPositions.append(_("Left"))
        panelPositions.append(_("Center"))
        panelPositions.append(_("Right"))

        const panelPosition = new Adw.ComboRow({
            title: _('Panel position'),
            subtitle: _('Choose position of panel displayed'),
            model: panelPositions,
            selected: this._window._settings.get_enum('panel-position')
        });
        settingsGroup.add(panelPosition);

        const panelIndex = new Adw.SpinRow({
            title: _('Panel Index'),
            subtitle: _('The position relative of panel menu to other items'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: this._window._settings.get_int('max-index'),
                step_increment: 1
            })
        });
        settingsGroup.add(panelIndex);

        this._window._settings.bind('panel-index', panelIndex, 'value', Gio.SettingsBindFlags.DEFAULT);
        panelPosition.connect("notify::selected", (widget) => {
            this._window._settings.set_int('panel-index', 0);
            this._window._settings.set_enum('panel-position', widget.selected);
        });
        this._window._settings.connect('changed::max-index', () => panelIndex.set_range(0, this._window._settings.get_int('max-index')));
    }
}
