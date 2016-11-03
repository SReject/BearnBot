# **Configuration**

These configuration files are provided for ease-of-life testing or local
instances. It is **highly** recommended that for publicly accessible instances the
configuration is set via environment variables and these files are removed.


# **Usage**

To indicate the bot should retrieve its configuration from file use the
`-bearnbotcfg` command line argument:
```
node bearnbot.js -bearnbotcfg
```

If you wish to use a specific configuration file specify it by using the
`-bearnbotcfg` command line argument with a path to the configuration file:
```
node bearnbot.js -bearnbotcfg="/path/to/config.json"
```


# **Details**

The configuration file must be properly formatted [JSON](https://json.org)
containing an object with the following items:


### `domain` - *required* - *String*
This is the domain under which the webserver is being ran. It must be a validly
registered domain, `localhost`, or an ip address.
```
"domain": "localhost"
```

&nbsp;

### `ssl` - *required* - *Boolean*
Currently used to indicate if the webserver can receive https requests.
```
"ssl": false
```

&nbsp;

### `database` - *required* - *Object*
Contains information related to the mongodb database to which data will be wrote

##### `address` - *required* - *String*
The address to the database server

##### `port` - *optional* - *Number*
The port of which to use when connecting to the database server. If not
specified it defaults to `27017`

##### `database` - *required* - *String*
The database on the server to use

##### `username` and `password` - *optional* - *String*
The username and password used to access the database. If one is specified the
other must also be specified





```
"database": {
    "address":  "example.com",
    "port":     27017,
    "database": "mydata",
    "username": "JohnDoe",
    "password": "xyz789",

}
```

&nbsp;

### `api` - *required* - *Object*
Contains information related to your beam oauth application.

##### `clientid` - *required* - *String*
The client_id beam assigned to your app

##### `clientsecret` - *required* - *String*
The client_secret beam assigned to your app
```
"api": {
    "clientid": "abc123",
    "clientsecret": "987zyx"
}
```

&nbsp;

### `webserver` - *required* - *Object*
Contains data related to the webserver component should be loaded

##### `enable` - *required* - *Boolean*
Indicates if the webserver component should be loaded

##### `address` - *optional* - *String*
The adapter address to bind listening connections to.

##### `port` - *optional* - *Number*
The port on which to listen for incoming connections.  
Defaults to port 80

```
"webserver": {
    "enable": true
    "address": "127.0.0.1",
    "port": 80
}
```

&nbsp;

### `chatbot` - *required* - *Object*
Contains data related to the beam chat-bot component

##### `enable` - *required* - *Boolean*
Indicates if the chatbot should be loaded.

##### `username` and `password` - *optional* - *String*
The username and password the bot will use as its default login to beam.  
Required if chatbot is enabled
```
"chatbot": {
    "enable": true
    "username": "BearnBot",
    "password": "321cba"
}
```

&nbsp;

### `logging` - *required* - *Object*
Contains data related to logging

##### `enable` - *required* - *Boolean*
Indicates that logging should be enabled

##### `directory` - *optional* - *String*
The directory to store logs in.
Defaults to `/logs`

##### `level` - *optional* - *String|Predfined*
Indicates the logging level; more severe levels log more information
Valid options: `error`, `info`, `verbose`, `debug`
Defaults to `info`
```
"logging": {
    "enable": true,
    "directory": "/logs",
    "level": "debug"
}
```

# **Config Skeleton**

```
{
    "domain": "localhost",
    "ssl"   : false,

    "database":{
        "address" : "database_address",
        "port"    : "port",
        "username": "database_username",
        "password": "database_password"
    },

    "api": {
        "clientid":     "your client_id_from_beam",
        "clientsecret": "your_client_secret_from_beam"
    },

    "webserver": {
        "enable" : true,
        "address": "127.0.0.1",
        "port"   : 80
    },

    "chatbot": {
        "enable":   true,
        "username": "Bot's Beam username",
        "password": "Bot's Beam password"
    },

    "logging":{
        "enable":    true,
        "directory": "/logs",
        "level":     "debug"
    }
}
```
