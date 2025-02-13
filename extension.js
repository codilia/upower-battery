import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Indicator from './indicator.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import UPowerGlib from 'gi://UPowerGlib';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
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

export default class UpowerBatteryExtension {
	constructor() {
		const proxy = new PowerManagerProxy(
			Gio.DBus.system,
			BUS_NAME,
			'/org/freedesktop/UPower');
		this._dbusCon = proxy.get_connection();
	}

	enable() {
		Log('Enable');
		this._indicator = new Indicator.Indicator();
		this._proxies = {};
		Main.panel.addToStatusArea('upowerBattery', this._indicator, 3, 'right');

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
	}

	_findDevices() {
		Log('Finding devices');
		const icons = {};
		icons[UPowerGlib.DeviceKind.MOUSE] = { icon: 'input-mouse-symbolic' };
		icons[UPowerGlib.DeviceKind.KEYBOARD] = { icon: 'input-keyboard-symbolic' };
		icons[UPowerGlib.DeviceKind.GAMING_INPUT] = { icon: 'input-gaming-symbolic' };
		icons[UPowerGlib.DeviceKind.TOUCHPAD] = { icon: 'input-touchpad-symbolic' };
		icons[UPowerGlib.DeviceKind.HEADSET] = { icon: 'audio-headset-symbolic' };
		icons[UPowerGlib.DeviceKind.HEADPHONES] = { icon: 'audio-headphones-symbolic' };
		icons[UPowerGlib.DeviceKind.BLUETOOTH_GENERIC] = { icon: 'bluetooth-symbolic' };
		icons[UPowerGlib.DeviceKind.SPEAKERS] = { icon: 'audio-speakers-symbolic' };
		icons[UPowerGlib.DeviceKind.PHONE] = { icon: 'smartphone-symbolic' };
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
						percentage: udevice.percentage,
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
	}
}

function init(meta) {
	return new UpowerBatteryExtension(meta.uuid);
}
