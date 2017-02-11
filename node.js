
const express = require('express');
const app = express();
const port = 3000;

var compiling = false;

var http = require('http').Server(app);

var server = app.listen(port, function(err) {  
  if (err) {
    return console.log('something bad happened', err);
  }
  console.log("Server is listening on localhost:" + port);
})

var fs = require('fs');
var io = require('socket.io')(server);
var bodyParser = require('body-parser')

io.on('connection', function(socket){
  console.log('+ User connected ' + socket.id);
  
  socket.on('msg', function(msg){
    console.log('message: ' + msg);
  });
  
});

app.use(bodyParser.urlencoded({ extended: true }));

function print(socketId, text)
{
    try {
    if(socketId)
        io.sockets.connected[socketId].emit("msg", text);
     }
     catch(ex)
     {
        (ex);
     }
        
	//io.emit("msg", text);
	console.log(text);
}

function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}


app.use('/', express.static('public'))

app.post('/', function (req, res) {

    var code = req.body.code;
    var socketId = req.body.socketId;
    
    if(compiling)
    {
        print(socketId, "Another user is compiling, try it again later please.");
        return;
    }
    
    compiling = true;

    
    
    //io.to(socketId).emit("msg", "pouze jednomu klientovi___________");
    
    //io.sockets.connected[socketId].emit("msg", "pouze jednomu klientovi___________");
    
    //io.sockets.socket(socketId).emit("msg", "pouze jednomu klientovi___________");
    
    print(socketId, "RX socketid: " + socketId);
    
	print(socketId, "Saving file...");
    
	fs.writeFile("../app/application.c", code, function(err) {
  
    if(err) {
        return console.log(err);
    }

    print(socketId, "The file was saved!");
	
	var spawn = require('child_process').spawn;
	var compile = spawn('make', ['all'], { cwd: ".."});

	compile.stdout.on('data', function (data) {
		print(socketId, String(data));
	});

	compile.stderr.on('data', function (data) {
		print(socketId, String(data));
	});

	compile.on('close', function (data) {
		if (data === 0) {
        
        var dstFilename = "firmware_" + makeid() + ".bin";
        print(socketId, "Binary: " + dstFilename);
		
		fs.rename("../out/firmware.bin", "public/" + dstFilename, function (err) {
			if (err) {
				print(socketId, "Copy error");
				return;
			}
            
            compiling = false;
			
			print(socketId, "Starting download");
			res.redirect(dstFilename);
		});
		
		}
	})
	
	
}); 
  
})




