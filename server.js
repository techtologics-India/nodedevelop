require('dotenv').config()
const cluster = require('cluster');
const os = require('os');
const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const controller = require('./modules');

const app = express();
const cpus = os.cpus().length;
const port = process.env.PORT;


// if (cluster.isMaster) {
//     console.log(cpus);
//     for (let i = 0; i < cpus; i++) {
//         cluster.fork();
//     }
//     cluster.on('exit', function (worker) {
//         console.log(`worker ${worker.id} exited, respawning...`);
//         console.log(`worker ${worker.process.pid} died`);
//         cluster.fork();
//     });
// } else {

    
    // 'mongodb://localhost/zamzam'
    mongoose.connect(process.env.MONGO_DB, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true

    }).then(() => {
        console.log("Database has Connected");
    }).catch(err => {
        console.log("Error : " + err);
    });

    app.use(cors({ credentials: true, origin: ['http://localhost:3000','https://zamzam-postlaunch-dev.netlify.app'] }));

    // app.use((req, res, next) => {
    //     const allowedOrigins = ['http://127.0.0.1:5000', 'http://localhost:3000', 'http://localhost:3000','https://zamzam-postlaunch-dev.netlify.app'];
    //     const origin = req.headers.origin;
    //     if (allowedOrigins.includes(origin)) {
    //          res.setHeader('Access-Control-Allow-Origin', origin);
    //     }
    //     //res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:8020');
    //     res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    //     res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    //     res.header('Access-Control-Allow-Credentials', true);
    //     return next();
    //   });
      

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    app.use(cookieParser());

    app.use(controller);
    // Route
    app.get('/', (req,res)=> {
    res.json({
        message: "Home Route",
        })
    })

    app.listen(port, () => {
        console.log('Server is running on port no ' + port);
    });
// }