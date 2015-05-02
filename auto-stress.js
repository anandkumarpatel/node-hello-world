var exec = require('child_process').exec;
var fs = require('fs');
/**
 * runs specified number of stress containers in backround
 * @param  {[type]}   num   count of stress containers to run
 * @param  {[type]}   image image of stress container
 * @param  {[type]}   args  extra args needed to pass in
 * @param  {Function} cb    (err)
 */
function runStressContainers (num, image, args, cb) {
  console.log('runBuild', num, image, args);
  var cmd = 'docker run -d ' + image + ' ' + args;
  var count = 0;
  function createContainer (err) {
    console.log('createContainer', err, 'count/max', count+'/'+num);
    if (err) { return cb(err); }
    if (count === num) { return cb(); }
    count++;
    exec(cmd, createContainer);
  }
  createContainer();
}
/**
 * runs build and returns time it took to run
 * @param  {string}   path location of dockerfile
 * @param  {string}   args any extra args to pass
 * @param  {Function} cb   (err, time)
 *                         time in ms
 */
function runBuild (path, args, cb) {
  console.log('runBuild', path, args);
  var start = new Date();
  var cmd = 'docker build ' + path + ' ' + args;
  exec(cmd, function (err) {
    console.log('runBuild', err);
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
    console.log('kill containers', err);
    // remove all containers
    exec('docker rm `docker ps -aq`', function (err) {
      console.log('rm containers', err);
      // list all images
      var list = "docker images | grep -v '" + ignoreImages.join('\\|') + "' | awk '{print $1}'";
      exec('docker rmi `' + list + '`', function (err) {
        console.log('rm images', err);
        // restart deamon
        exec('service docker restart', function (err) {
          console.log('docker restart', err);
          cb();
        });
      });
    });
  });
}

function runSingleTest (opts, cb) {
  console.log('runSingleTest', opts);
  var buildPath = opts.buildPath;
  var buildArgs = opts.buildArgs;
  var stressImage = opts.stressImage;
  var stressNum = opts.stressNum;
  var stressArgs = opts.stressArgs;
  var ignoreImages = opts.ignoreImages;
  var retryCount = 5;
  ignoreImages.push(stressImage);
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
  console.log('runSinglePermutaion', opts);
  var outFilePath = opts.outPath + '/' + stressNum;
  var out = fs.appendFileSync.bind(fs, outFilePath);
  var numTrials = opts.numTrials;
  var count = 0;
  out('trial,time\n');
  function runTest () {
    if (count === numTrials) { return cb(); }
    console.log('runTest', 'count/max', count+'/'+numTrials);
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
  console.log('runSuite', opts);
  var maxStress = opts.maxStress;
  var count = 1;
  function runPerms () {
    if (maxStress === count) { return cb(); }
    opts.stressNum = count;
    runSinglePermutaion(opts, function (err, time) {
      console.log('runSuite', err, 'count/max', count+'/'+maxStress);
      count++;
      runPerms();
    });
  }
}

function begin () {
  opts = {
    outFilePath: process.env.OUT_PATH || '../testOutput',
    numTrials: process.env.NUM_TRIALS || 10,
    maxStress: process.env.MAX_STRESS || 128,
    buildPath: process.env.BUILD_PATH || '.',
    buildArgs: process.env.BUILD_ARGS || '',
    stressImage: process.env.STRESS_IMAGE || 'jess/stress',
    stressArgs: process.env.STRESS_ARGS || '--cpu 1 --vm 1 --vm-bytes 1G --vm-hang 0',
    ignoreImages: process.env.IGNORE_IMAGES && process.env.IGNORE_IMAGES.split(',') || ['ubuntu'],
  };
  var start = new Date();
  console.log('start', runSuite, opts);
  runSuite(opts, function (err) {
    console.log('FINISHED', new Date() - start);
  });
}

begin();
