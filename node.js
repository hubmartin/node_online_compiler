

// Configure port
const port = 8080;



const fs = require('fs')
const path = require('path')
const express = require('express');
const app = express();

var compiling = false;
var http = require('http').Server(app);


// Create server
var server = app.listen(port, function(err) {  
  if (err) {
    return console.log('something bad happened', err);
  }
  console.log("Server is listening on localhost:" + port);
})



var io = require('socket.io')(server);
var bodyParser = require('body-parser')

var oldSocket = null;

// Define Socket.io messages
io.on('connection', function(socket){
  console.log('+ User connected ' + socket.id);
 
  socket.on('msg', function(msg){
    console.log('message: ' + msg);
  });
  
  socket.on('cmd', function(cmd){
    console.log('CMD: ' + cmd);
  });
  
  socket.on('loadExample', function(id){
    console.log('Loading: ' + id);
    
        var dirs = getDirectories(__dirname + "/bc-project/sdk/_examples");
    
        var example = dirs[id];
        
        console.log("Example: " + example);
        
        fs.readFile(__dirname + "/bc-project/sdk/_examples/" + example + "/application.c", "utf8", function (err,data) {
          if (err) {
            return console.log(err);
          }
      
      console.log("Sending EMI server>client");
      socket.emit("example", data);
    });
    
  });  

  socket.on('compile', function(cmd){
    

    compile(socket, cmd);
    
  });
});

app.use(bodyParser.urlencoded({ extended: true }));


function compile(socket, cmd)
{
    console.log(cmd);
    console.log('compile: ' + JSON.stringify(cmd, null, 4));
    code = cmd.files["application.c"];
    socketId = socket.id;

    if(compiling)
    {
        print(socketId, "Another user is compiling, try it again later please.");
        return;
    }
    
    compiling = true;
  
    print(socketId, "RX socketid: " + socketId);
    print(socketId, "Saving file...");

    for(var filename in cmd.files)
    {
        filename = path.basename(filename);
        if(
            filename.includes("/") ||
            filename.includes("\\") ||
            filename.includes("..") ||
            (!filename.endsWith(".c") && !filename.endsWith(".h"))
        )
        {
            console.log("ERROR filename: " + filename);
            compiling = false;
            return;
        }

        print(socketId, "Saving file " + filename);

        try
        {
        fs.writeFileSync("./bc-project/app/" + filename, cmd.files[filename])
        }
        catch(ex)
        {
            compiling = false;
            return console.log(ex);
        }

    }

    print(socketId, "The file was saved!");
    
    var spawn = require('child_process').spawn;
    var compile = spawn('make', [], { cwd: "./bc-project"});
    
    // Timeout if something goes wrong during compilation
    timeout = setTimeout(function(){
        print(socketId, "Compilation is too long, timeout.");
        compile.kill();
        compiling = false;
    }, 60000);

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
            
            fs.rename("./bc-project/out/debug/firmware.bin", "public/fw/" + dstFilename, function (err) {
            if (err) {
                print(socketId, "Binary copy error.");
                res.send("Binary copy error.");
                compiling = false;
                try{
                clearTimeout(timeout);
                }
                catch(ex) {}
                return;
            }
            
            compiling = false;
            try{
                clearTimeout(timeout);
            }
            catch(ex) {}
            
            print(socketId, "Starting download");
            //res.redirect("fw/" + dstFilename);
            socket.emit("download", "fw/" + dstFilename);
        });
        
        } else {
            print(socketId, "Compilation error");
            compiling = false;
            
            try {
                clearTimeout(timeout);
            }
            catch(ex) {}
        }
    })
    
}

function print(socketId, text)
{
    try {
    if(socketId)
        io.sockets.connected[socketId].emit("msg", text);
    }
    catch(ex) {(ex); }

    console.log(text);
}

// Create random characters to append to generated firmware
// This allows multiple clients to downlaod their own compiled firmwares at the same time
function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}


function getDirectories (srcpath) {
  return fs.readdirSync(srcpath)
    .filter(file => fs.statSync(path.join(srcpath, file)).isDirectory())
}

// Timeout during compilation
var timeout;

// Serve static content from "static" directory
app.use('/', express.static('public'))


// Get list of examples
// TODO: convert to Socket/AJAX
app.get("/examples", function(req, res) {

    var dirs = getDirectories(__dirname + "/bc-project/sdk/_examples");
    console.log(dirs);
    var str = "<h1 style=\"color: white;\">Can be loaded, not compiled yet</h1>";
    
    for(item in dirs)
    {
        // ugly hack
        str += "<a href = \"#\" style=\"color:white\" onclick=\"parent.loadExample("+item+")\">" + dirs[item] + "</a><br / >"
    }
    res.send(str);

    /*
     var out = https_req.get("https://firmware.bigclown.com/json", function(res) {

        var data = "";
        res.on('data', d => {
            data += d;
        })

        res.on('end', function(){
            const json = JSON.parse(data);

            var str = "<h1 style=\"color: white;\">Can be loaded, not compiled yet</h1>";

            for (var i in json.list)
            {
                str += "<a href = \"#\" style=\"color:white\" onclick=\"parent.loadExample("+json.list[i].name+")\">" + json.list[i].name + "</a><br / >"
                console.log(json.list[i].name);
            }

            response.send(str);
        })
    });
    */
});


app.post('/', function (req, res) {

    var code = req.body.code;
    var socketId = req.body.socketId;
    
    if(compiling)
    {
        print(socketId, "Another user is compiling, try it again later please.");
        return;
    }
    
    compiling = true;

  
    print(socketId, "RX socketid: " + socketId);
	print(socketId, "Saving file...");
    
	fs.writeFile("./bc-project/app/application.c", code, function(err) {
  
    if(err) {
        return console.log(err);
    }

    print(socketId, "The file was saved!");
	
	var spawn = require('child_process').spawn;
	var compile = spawn('make', [], { cwd: "./bc-project"});
    
    // Timeout if something goes wrong during compilation
    timeout = setTimeout(function(){
        print(socketId, "Compilation is too long, timeout.");
        compile.kill();
        compiling = false;
    }, 60000);

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
            
            fs.rename("./bc-project/out/debug/firmware.bin", "public/fw/" + dstFilename, function (err) {
			if (err) {
				print(socketId, "Binary copy error.");
                res.send("Binary copy error.");
                compiling = false;
                try{
                clearTimeout(timeout);
                }
                catch(ex) {}
				return;
			}
            
            compiling = false;
            try{
                clearTimeout(timeout);
            }
            catch(ex) {}
			
			print(socketId, "Starting download");
			res.redirect("fw/" + dstFilename);
		});
		
		} else {
            print(socketId, "Compilation error");
            res.send("Compilation error");
            compiling = false;
            
            try {
                clearTimeout(timeout);
            }
            catch(ex) {}
        }
	})
	
	
}); 
  
})




