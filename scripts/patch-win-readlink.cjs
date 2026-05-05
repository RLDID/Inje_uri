/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');

function normalizeReadlinkError(error) {
  if (process.platform !== 'win32' || !error || error.code !== 'EISDIR') {
    return error;
  }

  error.code = 'EINVAL';
  error.message = error.message.replace(
    'EISDIR: illegal operation on a directory',
    'EINVAL: invalid argument',
  );
  return error;
}

const originalReadlink = fs.readlink;
fs.readlink = function patchedReadlink(...args) {
  const callback = args[args.length - 1];

  if (typeof callback !== 'function') {
    return originalReadlink.apply(this, args);
  }

  args[args.length - 1] = function patchedReadlinkCallback(error, ...callbackArgs) {
    callback.call(this, normalizeReadlinkError(error), ...callbackArgs);
  };

  return originalReadlink.apply(this, args);
};

const originalReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function patchedReadlinkSync(...args) {
  try {
    return originalReadlinkSync.apply(this, args);
  } catch (error) {
    throw normalizeReadlinkError(error);
  }
};

if (fs.promises?.readlink) {
  const originalPromisesReadlink = fs.promises.readlink;
  fs.promises.readlink = async function patchedPromisesReadlink(...args) {
    try {
      return await originalPromisesReadlink.apply(this, args);
    } catch (error) {
      throw normalizeReadlinkError(error);
    }
  };
}
