require('dotenv').config();
const app = require("express")();
const server = require("http").createServer(app);
const options = {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
}
const io = require('socket.io')(server, options);

const users = {};
const socketToRoom = {};

app.get('/', (_, res) => {
    res.send('<h1>Server</h1>')
})

io.on('connection', socket => {
    socket.on("join room", roomID => {
        if (users[roomID]) {
            const length = users[roomID].length;
        
            if (length === 2) {
                socket.emit("room full");
                return;
            }

            users[roomID].push(socket.id);
        } else {
            users[roomID] = [socket.id];
        }

        socketToRoom[socket.id] = roomID;
        const usersInThisRoom = users[roomID].filter(id => id !== socket.id);

        socket.emit("all users", usersInThisRoom);
    });

    socket.on("sending signal", ({ userToSignal, signal, callerID }) => {
        io.to(userToSignal).emit('user joined', { signal, callerID })
    });

    socket.on("returning signal", ({ signal, callerID }) => {
        io.to(callerID).emit('receiving returned signal', { signal, id: socket.id });
    });

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        
        let room = users[roomID] || [];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomID] = room;
        }
    
        room.forEach(user => {
            socket.broadcast.to(user).emit('user disconnected', socket.id)
        })
    });

});

server.listen(process.env.PORT || 8000, () => console.log('server is running on port 8000'));


