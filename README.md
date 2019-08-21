# `rosdistro` Dependency Analysis
A tool for figuring out how prevalent dependency bugs are in the rosdistro package repository using GHTorrent. 

## Running 
Access to GHTorrent, Node.js and TypeScript is a requirement for using the code in this repo (see http://ghtorrent.org/raw.html)

- Set up the GHTorrent SSH tunnel in a separate terminal window.
- `cd` into this repository and run `npm install` and then `tsc`.
- Run `node fetch.js`.
- Run `node sample.js`. 
- Find results in `./results`.
