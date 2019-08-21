# `rosdistro` Dependency Analysis
A tool for figuring out how prevalent dependency bugs are in the rosdistro package repository using GHTorrent. 

## Building
TypeScript is a requirement for building the code in this repo. 

- `cd` into this repository and run `npm install`
- Run `tsc`

## Running
Access to GHTorrent and Node.js is a requirement for using the code in this repo.

- Set up the GHTorrent SSH tunnel in a separate terminal window (see http://ghtorrent.org/raw.html)
- `cd` into this repository and run `npm install`
- Run `node fetch.js`
- Run `node sample.js` 
- Find results in `results/`
