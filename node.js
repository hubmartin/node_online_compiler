
const express = require('express');
const app = express();
const port = 3000;

var compiling = false;

var http = require('http').Server(app);

var server = app.listen(port, function(err) {  
  if (err) {
    return console.log('something bad happened', err);
  }
  console.log('server is listening on ${port}');
})

var fs = require('fs');
var io = require('socket.io')(server);
var bodyParser = require('body-parser')

io.on('connection', function(socket){
  console.log('a user connected');
  
  socket.on('msg', function(msg){
    console.log('message: ' + msg);
  });
  
});

app.use(bodyParser.urlencoded({ extended: true }));

function print(text)
{
	io.emit("msg", text);
	console.log(text);
}

app.use('/', express.static('public'))

app.post('/', function (req, res) {


	print('Got a POST request<br />');
	print("Saving file...");

  
	var code = req.body.code;
  
	fs.writeFile("../app/application.c", code, function(err) {
  
    if(err) {
        return console.log(err);
    }

    print("The file was saved!");
	
	var spawn = require('child_process').spawn;
	var compile = spawn('make', ['all'], { cwd: ".."});

	compile.stdout.on('data', function (data) {
		print('stdout: ' + data);
	});

	compile.stderr.on('data', function (data) {
		print(String(data));
	});

	compile.on('close', function (data) {
		if (data === 0) {
		
		fs.rename("../out/firmware.bin", "public/firmware.bin", function (err) {
			if (err) {
				print("Copy error");
				return;
			}
			
			print("Starting download");
			res.redirect("firmware.bin");
		});
		
		}
	})
	
	
}); 
  
})




