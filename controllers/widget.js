//Global Configuration
var API_VERSION = 'v25.0';

//Login Session State
var INSTANCE_URL = Ti.App.Properties.getString('force.instanceURL');
var ACCESS_TOKEN = Ti.App.Properties.getString('force.accessToken');
var REFRESH_TOKEN = Ti.App.Properties.getString('force.refreshToken');

//Currently hard-coded to Summer 2012 release
var CONSUMER_KEY = Ti.App.Properties.getString('force.consumer.key');
var CONSUMER_SECRET = Ti.App.Properties.getString('force.consumer.secret');

var BASE_URL = Ti.App.Properties.getString('force.base_url');
var REDIRECT_URI = Ti.App.Properties.getString('force.redirect_uri');
var LOGIN_URL = BASE_URL + '/services/oauth2/authorize?display=touch&response_type=token' + '&client_id=' + Ti.Network.encodeURIComponent(CONSUMER_KEY) + '&redirect_uri=' + REDIRECT_URI;
var REFRESH_URL = BASE_URL + '/services/oauth2/token?grant_type=refresh_token&format=json' + '&client_id=' + Ti.Network.encodeURIComponent(CONSUMER_KEY) + '&refresh_token=' + REFRESH_TOKEN;

var cancel = function() {
};

//Authorize a Salesforce.com User Account
exports.authorize = function(callbacks) {

	//Authorization Window UI Constructor
	function AuthorizationWindow() {
		cancel = function() {
			$.forceWindow.close();
			callbacks.cancel && callbacks.cancel();
		};

		$.forceWindow.addEventListener('open', function(e) {
			if (OS_ANDROID) {
				$.ind.show();
			}
		});

		$.webView.addEventListener('load', function(e) {
			if (OS_ANDROID) {
				$.ind.hide();
			}
			$.forceWindow.fireEvent('urlChanged', e);
		});

		$.webView.setUrl(LOGIN_URL);

		$.forceWindow.open();

		return $.forceWindow;
	}

	//refresh the tokens if we have both the access and refresh tokens
	if (ACCESS_TOKEN && REFRESH_TOKEN) {
		// Setup the xhr object
		var xhr = Ti.Network.createHTTPClient({
			onload : function(e) {
				ACCESS_TOKEN = JSON.parse(this.responseText).access_token;
				Ti.App.Properties.setString('force.accessToken', ACCESS_TOKEN);
				callbacks.success();
			},
			onerror : function(e) {
				exports.authorize(callbacks);
			}
		});
		xhr.open("POST", REFRESH_URL);
		xhr.validatesSecureCertificate = true;
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.send(null);
	} else {
		var authWindow = new AuthorizationWindow();

		authWindow.addEventListener('urlChanged', function(e) {
			if (e.url.indexOf('/oauth2/success') !== -1) {
				var hash = e.url.split('#')[1];
				var elements = hash.split('&');
				for (var i = 0,
				    l = elements.length; i < l; i++) {
					var element = elements[i].split('=');
					switch (element[0]) {
					case 'access_token':
						ACCESS_TOKEN = Ti.Network.decodeURIComponent(element[1]);
						Ti.App.Properties.setString('force.accessToken', ACCESS_TOKEN);
						break;
					case 'refresh_token':
						REFRESH_TOKEN = Ti.Network.decodeURIComponent(element[1]);
						Ti.App.Properties.setString('force.refreshToken', REFRESH_TOKEN);
						break;
					case 'instance_url':
						INSTANCE_URL = Ti.Network.decodeURIComponent(element[1]);
						Ti.App.Properties.setString('force.instanceURL', INSTANCE_URL);
						break;
					default:
						break;
					}
				}
				callbacks.success();
				authWindow.close();
			}
		});
		authWindow.open();
	}
};

//blank out session info
exports.logout = function() {
	ACCESS_TOKEN = null;
	Ti.App.Properties.setString('force.accessToken', ACCESS_TOKEN);
	REFRESH_TOKEN = null;
	Ti.App.Properties.setString('force.refreshToken', REFRESH_TOKEN);
	INSTANCE_URL = null;
	Ti.App.Properties.setString('force.instanceURL', INSTANCE_URL);
};

/**
 * Standard HTTP Request
 * @param {Object} opts
 * @description The following are valid options to pass through:
 * 	opts.data		: mixed The data to pass
 * 	opts.format     : json, etc.
 * 	opts.headers    : object with name and value
 * 	opts.type		: string GET/POST
 * 	opts.url		: string The url source to call
 */
exports.request = function(opts, callback) {
	var xhr = Ti.Network.createHTTPClient();

	xhr.onload = function() {
		try {
			if (Number(xhr.status) >= 200 && Number(xhr.status) < 300) {
				callback(null, JSON.parse(this.responseText));
			} else {
				callback(JSON.parse(this.responseText), null);
			}
		} catch(e) {
			callback(e, null);
		};
	};

	xhr.onerror = function(e) {
		if (xhr.status === 401) {
			exports.logout();
			exports.authorize();
			err = "Session expired";
			callback(err, null);
		} else {
			callback(xhr.responseText, null);
		}
	};

	opts.headers = (opts.headers) ? opts.headers : {};
	opts.type = (opts.type) ? opts.type : "GET";
	opts.url = (opts.url) ? opts.url : '';

	var xhrUrl = INSTANCE_URL + '/services/data/' + API_VERSION + opts.url;

	if (opts.type.toUpperCase() === "POST") {
		xhrUrl += opts.url;
		xhr.send(JSON.stringify(opts.data));
	} else if (opts.type.toUpperCase() === "GET") {
		if (Object.keys(opts.data).length > 0) {
			xhrUrl += '?';
			var i = 0;
			for (key in opts.data) {
				xhrUrl += (i > 0) ? '&' : '';
				xhrUrl += key + '=' + opts.data[key];
				i++;
			}
			opts.data = null;
		}
	}

	xhr.open(opts.type, xhrUrl);

	xhr.validatesSecureCertificate = true;
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.setRequestHeader('Authorization', 'OAuth ' + ACCESS_TOKEN);
	xhr.setRequestHeader('X-User-Agent', 'salesforce-toolkit-rest-javascript/' + API_VERSION);

	if (Object.keys(opts.headers).length > 0) {
		for (key in opts.headers) {
			xhr.setRequestHeader(key, opts.headers[key]);
		}
	}

	xhr.send(opts.data);
};
