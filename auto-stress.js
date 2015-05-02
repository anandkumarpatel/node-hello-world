var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var fs = require('fs');
/**
 * runs specified number of stress containers in backround
 * @param  {[type]}   num   count of stress containers to run
 * @param  {[type]}   image image of stress container
 * @param  {[type]}   args  extra args needed to pass in
 * @param  {Function} cb    (err)
 */
function runStressContainers (num, image, args, cb) {
  var cmd = 'docker run -d ' + image + ' ' + args;
  var count = 0;
  createContainer();
  function createContainer (err) {
    if (err) { console.log('createContainer err', err); }
    if (err) { return cb(err); }
    if (count >= num) { return cb(); }
    console.log('----createContainer', 'count/max', count+1+'/'+num);
    count++;
    exec(cmd, createContainer);
  }
}
/**
 * runs build and returns time it took to run
 * @param  {string}   path location of dockerfile
 * @param  {string}   args any extra args to pass
 * @param  {Function} cb   (err, time)
 *                         time in ms
 */
function runBuild (path, args, cb) {
  var start = new Date();
  var cmd = 'docker build ' + args + ' ' + path;
  exec(cmd, function (err) {
    if (err) { console.log('****runBuild err', err); }
    if (err) { return cb(err); }
    cb(null, new Date() - start);
  });
}
/**
 * removes all containers and all images besides ones passed in
 * @param {object} ignoreImages array of images to not delete
 * @param  {Function} cb   (err)
 */
function clean (ignoreImages, cb) {
  // kill all running images
  exec('docker kill `docker ps -q`', function (err) {
    if (err) { console.log('docker kill err', err); }
    // remove all containers
    exec('docker rm -f `docker ps -aq`', function (err) {
      if (err) { console.log('docker rm err', err); }
      // list all images
      var list = "docker images | grep -v '" + ignoreImages.join('\\|') + "' | awk '{print $3}'";
      exec('docker rmi -f `' + list + '`', function (err) {
        if (err) { console.log('docker rmi err', err); }
        // restart deamon
        exec('service docker restart', function (err) {
          if (err) { console.log('docker restart err', err); }
          cb();
        });
      });
    });
  });
}

function runSingleTest (opts, cb) {
  var buildPath = opts.buildPath;
  var buildArgs = opts.buildArgs;
  var stressImage = opts.stressImage;
  var stressNum = opts.stressNum;
  var stressArgs = opts.stressArgs;
  var ignoreImages = opts.ignoreImages;
  var retryCount = 5;
  runTest();
  function runTest () {
    if (retryCount < 0) { cb(new Error('fail to run test')); }
    clean(ignoreImages, function () {
      runStressContainers(stressNum, stressImage, stressArgs, function (err) {
        if (err) { return runTest(); }
        runBuild(buildPath, buildArgs, function (err, log) {
          if (err) { return runTest(); }
          cb(null, log);
        });
      });
    });
  }
}

function runSinglePermutaion (opts, cb) {
  var outFilePath = opts.outFilePath + '/' + opts.stressNum;
  var out = fs.appendFileSync.bind(fs, outFilePath);
  var numTrials = opts.numTrials;
  var count = 0;
  out('trial,time\n');
  runTest();
  function runTest () {
    if (count >= numTrials) { return cb(); }
    console.log('--runTest', 'count/max', count+1+'/'+numTrials);
    runSingleTest(opts, function (err, time) {
      if (err) {
        fs.unlinkSync(outFilePath);
        return cb(err);
      }
      count++;
      out(count+','+time+'\n');
      runTest();
    });
  }
}

function runSuite (opts, cb) {
  var maxStress = opts.maxStress;
  var count = opts.minStress;
  runPerms();
  function runPerms () {
    if (count >= maxStress) { return cb(); }
    console.log('runSuite', 'count/max', count+'/'+maxStress);
    opts.stressNum = count;
    runSinglePermutaion(opts, function (err, time) {
      count += opts.incStress;
      runPerms();
    });
  }
}

function begin () {
  opts = {
    outFilePath: process.env.OUT_PATH || '../testOutput',
    numTrials: Number(process.env.NUM_TRIALS) || 10,
    maxStress: Number(process.env.MAX_STRESS) || 128,
    minStress: Number(process.env.MIN_STRESS) || 0,
    incStress: Number(process.env.INC_STRESS) || 1,
    buildPath: process.env.BUILD_PATH || '.',
    buildArgs: process.env.BUILD_ARGS || '--no-cache -t test/test',
    stressImage: process.env.STRESS_IMAGE || 'jess/stress',
    stressArgs: process.env.STRESS_ARGS || 'stress --cpu 1 --vm 1 --vm-bytes 1G --vm-hang 0',
    ignoreImages: process.env.IGNORE_IMAGES && process.env.IGNORE_IMAGES.split(',') || ['IMAGE', 'ubuntu', 'jess/stress'],
  };
  execSync('rm -rf '+opts.outFilePath+' || echo');
  execSync('mkdir -p '+opts.outFilePath+' || echo');
  var start = new Date();
  console.log('start', opts);
  runSuite(opts, function (err) {
    console.log('FINISHED', new Date() - start);
  });
}

begin();
