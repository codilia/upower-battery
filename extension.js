import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Indicator from './indicator.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import UPowerGlib from 'gi://UPowerGlib';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
const xml = '<node>\
   <interface name="org.freedesktop.UPower.Device">\
      <property name="Type" type="u" access="read" />\
      <property name="State" type="u" access="read" />\
      <property name="Percentage" type="d" access="read" />\
      <property name="TimeToEmpty" type="x" access="read" />\
      <property name="TimeToFull" type="x" access="read" />\
      <property name="IsPresent" type="b" access="read" />\
      <property name="IconName" type="s" access="read" />\
   </interface>\
</node>';
const PowerManagerProxy = Gio.DBusProxy.makeProxyWrapper(xml);
const BUS_NAME = 'org.freedesktop.UPower';


var Log = function (msg) {
	if (true) {
		console.log('[upower-battery] ' + msg);
	}
}

var LogError = function (msg) {
	console.log('[upower-battery] ' + msg);
}

export default class UpowerBatteryExtension extends Extension {
	enable() {
		Log('Enable');
		this._proxy = new PowerManagerProxy(
			Gio.DBus.system,
			BUS_NAME,
			'/org/freedesktop/UPower');
		this._dbusCon = this._proxy.get_connection();

		this._settings = this.getSettings();
		this._indicator = new Indicator.Indicator();
		this._proxies = {};
		this._positionInPanelChangedLocked = false;
		this._panelIndexPositionChanged(true);

		var iname = 'org.freedesktop.UPower';
		var sender = 'org.freedesktop.UPower';
		this._subIdAdd = this._dbusCon.signal_subscribe(sender, iname, 'DeviceAdded', null, null, 0, () => {
			Log('Device added')
			this._refresh();
		});
		this._subIdRem = this._dbusCon.signal_subscribe(sender, iname, 'DeviceRemoved', null, null, 0, () => {
			Log('Device removed')
			this._refresh();
		});
		this._once = GLib.timeout_add(
			GLib.PRIORITY_DEFAULT, 10, 
			() => {
			  this._refresh();
			  return false;
		});
        this._settings.connectObject(
            'changed::panel-index', () => {
                if(!this._positionInPanelChangedLocked)
                    this._panelIndexPositionChanged(false);
            },
            'changed::panel-position', () => {
                this._panelIndexPositionChanged(true);
            },
            this
        );
	}

    _panelIndexPositionChanged(positionChanged){
        this._positionInPanelChangedLocked = true;
		const position = this._settings.get_string('panel-position');
		const index = this._settings.get_int('panel-index');
		let panelBox = Main.panel._rightBox;
		if(position === 'left')
		    panelBox = Main.panel._leftBox;
		else if(position === 'center')
		    panelBox = Main.panel._centerBox;
		positionChanged && this._settings.set_int('max-index', panelBox.get_children().length);
		const parent = this._indicator.get_parent()
		if(parent) {
		    parent.remove_actor(this._indicator);
		    panelBox.insert_child_at_index(this._indicator, index);
		} else {
		    Main.panel.addToStatusArea('upowerBattery', this._indicator, index, position);
		}
        this._positionInPanelChangedLocked = false;
    }

	_refresh() {
		Log('Refresh')
		const devices = this._findDevices();
		devices.forEach((device, index) => {
			try {
				device.udevice.refresh_sync(null);
			} catch (error) {
				LogError('Error ' + error)
			}
		});
		this._update();
	}

	_update() {
		const devices = this._findDevices();
		this._indicator.refresh(devices);
		devices.forEach((device, index) => {
			this._indicator.setLabel(device.name, device.udevice.percentage, index);
		});
	}

	_findDevices() {
		Log('Finding devices');
		const icons = {};
		icons[UPowerGlib.DeviceKind.MOUSE] = { icon: 'input-mouse-symbolic' };
		icons[UPowerGlib.DeviceKind.KEYBOARD] = { icon: 'input-keyboard-symbolic' };
		icons[UPowerGlib.DeviceKind.GAMING_INPUT] = { icon: 'input-gaming-symbolic' };
		icons[UPowerGlib.DeviceKind.TOUCHPAD] = { icon: 'input-touchpad-symbolic' };
		icons[UPowerGlib.DeviceKind.HEADSET] = { icon: 'audio-headphones-symbolic' };
		icons[UPowerGlib.DeviceKind.HEADPHONES] = { icon: 'audio-headphones-symbolic' };
		const devices = [];
		const upowerClient = UPowerGlib.Client.new_full(null);
		const udevices = upowerClient.get_devices();
		const newProxies = {}
		for (let i = 0; i < udevices.length; i++) {
			const udevice = udevices[i];
			if (udevice.kind in icons) {
				if (udevice.state != UPowerGlib.DeviceState.UNKNOWN || udevice.native_path.includes("bluez")) {
					const icon = icons[udevice.kind];
					Log('Found device: ' + icon.icon + ' | ' + udevice.native_path);
					devices.push({
						name: udevice.model,
						path: udevice.native_path,
						icon: icon.icon,
						udevice: udevice,
					});
				}
				if (udevice.native_path in this._proxies) {
					newProxies[udevice.native_path] = this._proxies[udevice.native_path];
				} else {
					const proxy = new PowerManagerProxy(Gio.DBus.system,
						BUS_NAME,
						udevice.get_object_path()
					);
					proxy.connect('g-properties-changed', () => {
						Log('Property changed for ' + udevice.model);
						this._update();
					});
					newProxies[udevice.native_path] = proxy;
				}
			}
		}
		this._proxies = newProxies;
		devices.sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : ((a.native_path > b.native_path) ? 1 : -1)));
		return devices;
	}

	disable() {
		Log('Disable');
		this._dbusCon.signal_unsubscribe(this._indicator.subIdAdd);
		this._dbusCon.signal_unsubscribe(this._indicator.subIdRem);
		this._proxies = {};
		if (this._indicator) {
			this._indicator.destroy();
			this._indicator = null;
		}
		if (this._once) {
			GLib.Source.remove(this._once);
			this._once = null;
		}
		this._settings.disconnectObject(this);
	}
}

