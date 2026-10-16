import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import St from 'gi://St';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

export const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init(extension) {
            super._init(0.0, _('UPower Battery Indicator'));
            this._settings = extension.getSettings();
            this._container = new St.BoxLayout();
            this._labels = [];
            this._icons = [];
            this._menuItems = [];
            this._prevDevicesSettings = [];
            this._devices = [];
        }

        refresh(devices) {
            const devicesSettings = devices.map(({ path, icon }) => ({ path, icon }));
            this._devices = devices;

            if (JSON.stringify(devicesSettings) !== JSON.stringify(this._prevDevicesSettings)) {
                this.menu.removeAll();
                this._menuItems = [];
                this._icons = [];
                this._labels = [];
                this._createBoxes(devices);
            }
            this._prevDevicesSettings = devicesSettings;
            devices.forEach((device, index) => {
                const label = `${device.percentage}%`;
                if (this._labels[index]) {
                    this._labels[index].text = label;
                }
                if (this._menuItems[index]) {
                    this._menuItems[index].label.set_text(device.name);
                    this._menuItems[index].percentageLabel.set_text(label);
                }
            });
            this._updateLowIcons();
            this.visible = devices.length > 0;
        }

        _updateLowIcons() {
            const highlight = this._settings.get_boolean('highlight-low-battery');
            this._icons.forEach((icon, index) => {
                const device = this._devices[index];
                if (!icon || !device) {
                    return;
                }
                if (highlight && device.percentage <= 10) {
                    icon.add_style_class_name('upower-battery-icon-low');
                } else {
                    icon.remove_style_class_name('upower-battery-icon-low');
                }
            });
        }

        _createBoxes(devices) {
            this._container.remove_all_children();
            devices.forEach((device, index) => {
                const key = device.path + device.name;
                const box = this._createBox(device, index);
                const item = new PopupMenu.PopupImageMenuItem(device.name, device.icon);
                item.label.x_expand = true;
                item.percentageLabel = new St.Label({
                    text: `${device.percentage}%`,
                    y_align: Clutter.ActorAlign.CENTER,
                    x_align: Clutter.ActorAlign.END,
                });
                item.add_child(item.percentageLabel);
                item.set_child_above_sibling(item.percentageLabel, item.label);
                const hiddenDevices = this._settings.get_strv('hidden-devices');
                const hidden = hiddenDevices.includes(key);
                item.setOrnament(hidden ? PopupMenu.Ornament.NONE : PopupMenu.Ornament.CHECK);
                box.visible = !hidden;
                item.connect('activate', () => {
                    var hiddenDevices = this._settings.get_strv('hidden-devices');
                    var hidden = !hiddenDevices.includes(key);
                    if (hidden) {
                        hiddenDevices.push(key);
                    } else {
                        hiddenDevices = hiddenDevices.filter((v) => v !== key);
                    }
                    this._settings.set_strv('hidden-devices', hiddenDevices);
                    item.setOrnament(hidden ? PopupMenu.Ornament.NONE : PopupMenu.Ornament.CHECK);
                    box.visible = !hidden;
                });
                this._container.add_child(box);
                this._menuItems[index] = item;
                this.menu.addMenuItem(item);
            });
            this._addHighlightLowOption();
            this.add_child(this._container);
        }

        _addHighlightLowOption() {
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            const enabled = this._settings.get_boolean('highlight-low-battery');
            const item = new PopupMenu.PopupMenuItem(_('Highlight low battery in red'));
            item.set_child_above_sibling(item.get_child_at_index(0), item.label);
            item.setOrnament(enabled ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
            item.connect('activate', () => {
                const value = !this._settings.get_boolean('highlight-low-battery');
                this._settings.set_boolean('highlight-low-battery', value);
                item.setOrnament(value ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
                this._updateLowIcons();
            });
            this.menu.addMenuItem(item);
        }

        _createBox(device, index) {
            const box = new St.BoxLayout({ style_class: 'panel-status-menu-box' });

            this._icons[index] = this._createBoxIcon(device);
            this._labels[index] = this._createBoxLabel();

            box.add_child(this._icons[index]);
            box.add_child(this._labels[index]);

            return box;
        }

        _createBoxLabel() {
            const label = new St.Label({
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.START,
                style_class: 'upower-battery-label',
            });
            label.get_clutter_text().ellipsize = 0;
            return label;
        }

        _createBoxIcon(device) {
            return new St.Icon({
                icon_name: device.icon || 'battery-full-symbolic',
                style_class: 'system-status-icon upower-battery-icon',
            });
        }

    }
);

