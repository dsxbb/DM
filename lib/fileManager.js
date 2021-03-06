/* global isDirectory */
/**
 * 封装关于文件目录的操作
 * 
 */
var fs = require('fs'),
	path = require('path'),
	filePath, travelDir,
	readAll, createDir,
	rename, rmdirSync,
	uploadFile,getSameFile,
	getType, formatSize,
	rmdirAll;

/**
 * 转换文件类型
 */

getType = function (ext) {
	
	ext = ext.toLowerCase();
	var typeMap = {
		'img': 1,
		'jpg': 1,
		'bmp': 1,
		'gif': 1,
		'jpeg': 1,
		'png': 1,
		'doc': 2,
		'docx': 2,
		'pdf': 2,
		'txt': 2,
		'avi': 3,
		'wmv': 3,
		'rmvb': 3,
		'mkv': 3,
		'mp3': 4,
		'wma': 4,
		'wave': 4,
		'default': 5
	};
	return (typeMap[ext] || typeMap['default']);
}

/**
 * 根据类型转换文件扩展名
 * 
 */
getExtension = function(type) {
	var extensionMap = [
		/[*]/,
		/img|jpg|bmp|gif|jpeg|png/i,
		/doc|docx|pdf|txt/i,
		/avi|wmv|rmvb|mkv/i,
		/mp3|wma|wave/i,
		/png|jpg|bmp|gif|jpeg|png|doc|docx|pdf|txt|avi|wmv|rmvb|mkv|mp3|wma|wave/i
	],
	type = parseInt(type, 10);
	return extensionMap[type];
}


/**
 * 格式化文件大小
 * @param  {[type]} size [description]
 * @return {[type]}      [description]
 */
formatSize = function(size) {
	if(!size) {
		return '-';
	}
	var sizeMap = ['B', 'KB', 'MB', 'GB', 'TB'];
	var index = 0;

	size = (size / Math.pow(1024, (index = Math.floor(Math.log(size) / Math.log(1024))))).toFixed(2);

	return size + ' ' + sizeMap[index];
}


/**
 * 深度遍历某个目录下的所有文件和目录
 * @param  {[type]}   dir      [遍历起始目录]
 * @param  {Function} callback [文件回调处理函数]
 */
travelDir = function(dir, callback) {
	fs.readdirSync(dir).forEach(function (file) {
        var pathname = path.join(dir, file);
		
		// 遍历子目录
        if (fs.statSync(pathname).isDirectory()) {
            travelDir(pathname, callback);
        }
        else {
            callback(pathname, file);
        }
    });
};

/**
 * 列出某个目录下的所有目录和文件（只遍历一层）
 * @param 
 */
readAll = function(basePath, dir) {
	dir = dir ? basePath + '/' + dir : basePath;
	var currentFiles = fs.readdirSync(dir),
		files = [];
	currentFiles.forEach(function (file) {
		var currentPath = dir + '/' + file,
			isdir;
		fileStats = fs.statSync(currentPath),
		isdir = fileStats.isDirectory()
		files.push({
			isdir: isdir,
			path: currentPath.replace(basePath, ''),
			filename: file,
			mtime: fileStats.mtime,
			ctime: fileStats.ctime,
			size: formatSize(fileStats.size),
			type: isdir ? 0 : getType(path.extname(file).slice(1))
		});
	});
	files.sort(function(a, b) {
		return a.type > b.type;
	});
	return files;
}

/**
 * 创建新目录
 */
createDir = function (dirname, mode, callback) {
		var message, status;
		mode = mode || 0755;
		if(fs.existsSync(dirname)) {
			message = "文件夹已存在";
			status = 0;
		}
		else {
			fs.mkdirSync(dirname, mode);
			message = "文件夹创建成功";
			status = 1;
		}
		return {
			message: message,
			status:status
		};
};

/**
 * 重命名文件
 */
rename = function (currentName, newName) {
		var message, status;
		if(!fs.existsSync(newName)) {
			try {
				fs.renameSync(currentName, newName);
				message = "重命名成功";
				status = 1;
			}
			catch(e) {
				message = "重命名失败";
				status = 0;
			}
		}
		else {
			message = "文件夹已存在";
			status = 0;
		}
		
		return {
			message: message,
			status:status
		};
};

/**
 * 递归删除目录以及目录下的文件
 * @param  {[type]} )  dir 目录名
 * @return {[type]}   [description]
 */
rmdirSync = (function () {
	
	function iterator(url, dirs){
        var stat = fs.statSync(url);
        if(stat.isDirectory()){
            dirs.unshift(url);
            inner(url, dirs);
        }
		else 
		if(stat.isFile()) {
			  //删除文件
            fs.unlinkSync(url);
        }
    }
	 
    function inner(url,　dirs){
        var arr = fs.readdirSync(url);
        for(var i = 0, el ; el = arr[i++];) {
            iterator(url + "/" + el, dirs);
        }
    }
	 
    return function(dir) {
		var message, status;
        var dirs = [];
 
        try {
            iterator(dir,dirs);
            for(var i = 0, el ; el = dirs[i++];) {

				//删除所有存在的目录
                fs.rmdirSync(el);
            }
			message = "文件删除成功";
			status = 1;
        }
		catch (e) {

			//如果文件或目录本来就不存在
			message = "文件删除失败";
			status = 0;
        }
		 
		return {
			message: message,
			status: status
		}
    };
})();

rmdirAll = function(basePath, dirs) {
	var len = dirs.length,
		result, message;
	for(var i = 0; i < len; i++) {
		result = rmdirSync(basePath + dirs[i]);
	}
	message = result.status ? '删除成功':'删除失败'; 
	return {
		message: message,
		status: result.status
	}
}

/**
 * 上传文件
 */

uploadFile = function (tmpPath, currentPath, filename) {
	
    var targetPath = currentPath + '/' + filename,
    	message, status, error;
    
    // 文件不存在后复制文件
    if(!fs.existsSync(targetPath)) {
    		
    		try {//复制文件到指定的目录
    			fs.createReadStream(tmpPath).pipe(fs.createWriteStream(targetPath));
    			message = '文件' + filename + ' 上传成功';
        		status = 1;
        	}
        	catch(e) {
    			message = e;
        		status = 0;
    		}
    }
    else {
    	message = '文件上传失败,' + filename + ' 已存在',
        status = 0;
    }
    	
    // 删除临时文件夹文件,
    fs.unlinkSync(tmpPath);
        
    return {
    	error: error,
    	message: message,
    	status: status
    }
};

/**
 * 查找同一类型的文件
 */
getSameFile = function (basePath,type) {
	var files = [],
		pattern = getExtension(type);
	travelDir(basePath,function (pathname, filename) {
		var ext = path.extname(pathname).slice(1);
		if( type === '5') {
			if(!pattern.test(ext)) {
				var stat = fs.statSync(pathname),
				isdir = stat.isDirectory();
				files.push({
					isdir: isdir,
					path: pathname.replace(basePath, ''),
					filename: filename,
					mtime: stat.mtime,
					ctime: stat.ctime,
					size: formatSize(stat.size),
					type: parseInt(type)
				});
			}
			
		}
		else
		if( pattern.test(ext)) {
			var stat = fs.statSync(pathname),
				isdir = stat.isDirectory();
				files.push({
				isdir: isdir,
				path: pathname.replace(basePath, ''),
				filename: filename,
				mtime: stat.mtime,
				ctime: stat.ctime,
				size: formatSize(stat.size),
				type: parseInt(type)
			});
		}
	});
	files.sort(function(a, b) {
		return a.type > b.type;
	});
	return files;
};

//测试

// var basePath = process.argv[2];

//getSameFile(basePath,'js');

//console.log(readAll(basePath));

//console.log(createDir(basePath,'b/c/c'));

// rename(basePath + 'c', basePath + 'b', function (message) {
// 	console.log(message);
// });

//console.log(rmdirSync(basePath + '/' + 'b'));
//console.log(getSameFile(basePath, 'docx'));

module.exports = {
	readAll: readAll,
	createDir: createDir,
	rename: rename,
	rmdirAll:rmdirAll,
	getSameFile: getSameFile,
	uploadFile: uploadFile
};
