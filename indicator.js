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

        refresh(devices) {
            const devicesSettings = devices.map(({ native_path, icon }) => ({ native_path, icon }));

            if (JSON.stringify(devicesSettings) !== JSON.stringify(this._prevDevicesSettings)) {
                this.menu.removeAll();
                this._menuItems = [];
                this._icons = [];
                this._labels = [];
                this._createBoxes(devices);
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
    
        }

        _createBoxes(devices) {
            this._container.remove_all_children();
            devices.forEach((device, index) => {
                const box = this._createBox(device, index);
                this._container.add_child(box);
                this._menuItems[index] = new PopupMenu.PopupImageMenuItem(device.name, device.icon);
                this.menu.addMenuItem(this._menuItems[index]);
            });
            this.add_child(this._container);
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

