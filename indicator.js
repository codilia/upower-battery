const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const { GObject, St, Clutter } = imports.gi;

var IndicatorController = GObject.registerClass(
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
                this._container.remove_all_children();
                this.menu.removeAll();
                this._menuItems = [];
                this._icons = [];
                this._labels = [];
                this._addBoxes(devices);
            }
            this._prevDevicesSettings = devicesSettings;
        }

        setLabel(name, percent, index) {
            const label = percent + '%';
            if (this._labels[index]) {
                this._labels[index].text = (label || '').trim();
            }
            if (this._menuItems[index]) {
                this._menuItems[index].label.set_text(name + ': ' + label);
            }
        }

        _addBoxes(devices) {
            if (!devices.length) {
                const box = this._getBox({}, 0);
                this._container.add_child(box);
            } else {
                devices.forEach((device, index) => {
                    const box = this._getBox(device, index);
                    this._container.add_child(box);
                    this._menuItems[index] = new PopupMenu.PopupMenuItem(device.name);
                    this.menu.addMenuItem(this._menuItems[index]);
                });
            }
            this.add_child(this._container);
        }

        _getBox(device, index) {
            const box = new St.BoxLayout({ style_class: 'panel-status-menu-box' });

            this._icons[index] = this._getBoxIcon(device);
            this._labels[index] = this._getBoxLabel();

            box.add_child(this._icons[index]);
            box.add_child(this._labels[index]);

            return box;
        }

        _getBoxLabel() {
            const label = new St.Label({
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.START,
                style_class: 'upower-battery-label',
            });
            label.get_clutter_text().ellipsize = 0;
            return label;
        }

        _getBoxIcon(device) {
            return new St.Icon({
                icon_name: device.icon || 'battery-full-symbolic',
                style_class: 'system-status-icon upower-battery-icon',
            });
        }

    }
);

