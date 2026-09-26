import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import St from 'gi://St';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';

export const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('UPower Battery Indicator'));
            this._container = new St.BoxLayout();
            this._labels = [];
            this._icons = [];
            this._menuItems = [];
            this._prevDevicesSettings = [];
        }

        refresh(devices, extension) {
            const devicesSettings = devices.map(({ path, icon }) => ({ path, icon }));

            if (JSON.stringify(devicesSettings) !== JSON.stringify(this._prevDevicesSettings)) {
                this.menu.removeAll();
                this._menuItems = [];
                this._icons = [];
                this._labels = [];
                this._createBoxes(devices, extension);
            }
            this._prevDevicesSettings = devicesSettings;
            devices.forEach((device, index) => {
                const label = device.percentage + '%';
                if (this._labels[index]) {
                    this._labels[index].text = (label || '').trim();
                }
                if (this._menuItems[index]) {
                    this._menuItems[index].label.set_text(device.name + ': ' + label);
                }
            });
            this.visible = devices.length > 0;
        }

        _createBoxes(devices, extension) {
            this._container.remove_all_children();
            devices.forEach((device, index) => {
                const key = device.path + device.name;
                const box = this._createBox(device, index);
                const item = new PopupMenu.PopupImageMenuItem(device.name, device.icon);
                const hiddenDevices = extension.getSettings().get_strv('hidden-devices');
                const hidden = hiddenDevices.includes(key);
                this._setChecked(item, !hidden);
                box.visible = !hidden;
                item.connect('activate', () => {
                    var hiddenDevices = extension.getSettings().get_strv('hidden-devices');
                    var hidden = !hiddenDevices.includes(key);
                    if (hidden) {
                        hiddenDevices.push(key);
                    } else {
                        hiddenDevices = hiddenDevices.filter((v) => v !== key);
                    }
                    extension.getSettings().set_strv('hidden-devices', hiddenDevices);
                    this._setChecked(item, !hidden);
                    box.visible = !hidden;
                });
                this._container.add_child(box);
                this._menuItems[index] = item;
                this.menu.addMenuItem(item);
            });
            this.add_child(this._container);
        }

        _setChecked(item, checked) {
            if (!item._checkIcon) {
                item._checkIcon = new St.Icon({
                    icon_name: 'object-select-symbolic',
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'popup-menu-icon upower-battery-check',
                });
                item.insert_child_at_index(item._checkIcon, 0);
            }
            // Toggle opacity instead of visibility so the icon always
            // reserves its space and the labels stay aligned.
            item._checkIcon.opacity = checked ? 255 : 0;
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

