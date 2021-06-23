const https = require("https");
var Sequelize = require('sequelize');
 
function get_url(){
    let url = "https://swapi.dev/api/planets?format=json";
    return url;
}
 
function get_settings(){
    const settings = {
        hostname: 'swapi.dev',
        port: 443,
        path: '/api/planets?format=json',
        method: 'GET'
    }
    return settings;
}
 
function get_mapper(){
    let mapper = {
        "name":             'nombre',
        "rotation_period":  'periodo_rotacion',
        "orbital_period":   'period_orbital',
        "diameter":         'diametro',
        "climate":          'clima',
        "gravity":          'gravedad',
        "terrain":          'terreno',
        "surface_water":    'superficie_agua',
        "population":       'poblacion',
        "created":          'creado',
        "edited":           'editado',
        "url":              'url'
    }
    return mapper;
}
 
function get_database_configuration(){    
    var host = "us-cdbr-east-04.cleardb.com";
    var user = "bdb6f715bfcd26";
    var password = "1e4347d4";
    var database = "heroku_1bda530ca55e0cf";
    return {
        "host":host,
        "user":user,
        "password":password,
        "database":database
    };
}
 
var get_sequelize = ()=>{
    var config = get_database_configuration();
    var sequelize = new Sequelize(
            config['database'], 
            config['user'], 
            config['password'], 
            {
                host: config['host'],
                dialect: 'mysql',
                pool: {
                    max: 5,
                    min: 0,
                    idle: 10000
                }
            }
    );
    return sequelize;
}
 
var get_model = ()=>{
    return {
        nombre: Sequelize.STRING,
        periodo_rotacion: Sequelize.INTEGER,
        periodo_orbital: Sequelize.INTEGER,
        diametro: Sequelize.INTEGER,
        clima: Sequelize.STRING,
        gravedad: Sequelize.STRING,
        terreno: Sequelize.STRING,
        superficie_agua: Sequelize.INTEGER,
        poblacion: Sequelize.STRING,
        creado: Sequelize.DATE,
        editado: Sequelize.DATE,
        url: Sequelize.STRING
    };
}
var get_config_table = ()=>{
    return {
        timestamps: false,
        freezeTableName: true,
        tableName: 'planeta'
    };
}
var create_model = (sequelize)=>{
    var Planet = sequelize.define('planet', get_model(), get_config_table());
    return Planet;
}
 
var insert_data = (sequelize,Planet,item)=>{
    sequelize.sync().then(
            async ()=>{
                return await Planet.create(item);
            }
        ).then(
            function(planet) {
                console.log(
                    "Planeta",
                    planet.get(
                        {
                            plain: true
                        }
                    )
                );
            }
        );
}
 
var create_data = async ()=>{
    const req = https.request(
        get_settings() , 
        res => {
            var data = '';
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end', function () {
                var json = JSON.parse(data);
                var results = json.results;
                var sequelize = get_sequelize();
                var Planet = create_model(sequelize);
 
                var resultados = results.map(
                    (item)=>{
                        var data_item  = {};
                        var mapper = get_mapper();
                        for(var index in item){
                            if(mapper[index]){
                                data_item[mapper[index]] = item[index];
                            }                        
                        }
                        insert_data(sequelize, Planet, data_item);
                        return data_item;
                    }
                );
            });
        }
    );
    req.on('error', error => 
        {
            console.error(error);
        }
    );
    req.end();
}
 
var read_data = async ()=>{
    var sequelize = await get_sequelize();
    var Planet = await create_model(sequelize);
    var planets = await Planet.findAll();
    var items = planets.map(
         (item)=>{
            return item.get(
                        {
                            plain: true
                        }
                    );
        }
    );
    var count = items.length;
    var results = {
        count, 
        results: items
    }
    return results;
}


exports.handler = async (event, context) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));
    let results='';
    let count=0;
    let message;
    let statusCode = '200';
    var data = new Array();
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        switch (event.httpMethod) {
            case 'GET':
                message = "Datos de resultado";
                data = await read_data();
                results = data.results;
                count = data.count;
                break;
            case 'POST':
                await create_data();
                message = "Datos cargados";
                break;
            default:
                throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
    } catch (err) {
        statusCode = '400';
        message = err.message;
    } finally {
        message = JSON.stringify(message);
    }

    return {
        statusCode,
        message,
        headers,
        results,
        count
    };
};


