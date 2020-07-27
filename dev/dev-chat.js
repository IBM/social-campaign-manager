/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/scripts', express.static(__dirname + '/../node_modules/socket.io-client/dist/'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/dev-chat.html');
});

io.on('connection', function(socket) {
    console.log('User connected');

    socket.on('chat-message', function(msg) {
        console.log('message: ' + msg);
        io.emit('chat-message', msg);
    });

    socket.on('disconnect', function() {
        console.log('User disconnected');
    });
});

const server = http.listen(3001, () => {
    console.log('Dev Chat server is running on port', server.address().port);
});
