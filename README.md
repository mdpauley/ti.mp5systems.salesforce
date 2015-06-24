# Basic Salesforce.com API functions for Alloy

### Set variables in config.json
```
    "env:development": {
        "force": {
            "consumer": {
                "key": "SomethingReallySilly",
                "secret": "8765430999"
            },
            "base_url": "https:/test.salesforce.com",
            "redirect_uri": "https://test.salesforce.com/services/oauth2/success"
        }
    }
```
### Use Alloy Global (is this really needed?)
```
Ti.App.Properties.setString('force.consumer.key', Alloy.CFG.force.consumer.key);
Ti.App.Properties.setString('force.consumer.secret', Alloy.CFG.force.consumer.secret);
Ti.App.Properties.setString('force.redirect_uri', Alloy.CFG.force.redirect_uri);
Ti.App.Properties.setString('force.base_url', Alloy.CFG.force.base_url);
```

### Load the widget
```
var force = Alloy.createWidget('com.mp5systems.salesforce');
```

### Authorize
```
force.authorize({
	success : function() {
		$.index.open();
	},
	error : function() {
		alert('error');
	},
	cancel : function() {
		alert('cancel');
	}
});

### Run a query
```
	force.request({
		"type" : "GET",
		"url" : "/query/",
		"data":{
			"q": "SELECT+Name+from+Account+WHERE+isDeleted+=+FALSE"
		}
	}, function(e, r){
		if(e) {
			console.log("ERROR: " + e);
		} else {
			var records = r.records;
			var contacts = [];
			_.each(records, function(record){
				console.log(record);
				contacts.push({title: record.Name});
			});
			$.table.setData(contacts);
		}
	});
```

```
