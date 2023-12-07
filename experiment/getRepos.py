import os
import subprocess

repos = [
        {'url':'https://github.com/streamich/memfs.git','version':'a9d2243'},
        {'url':'https://github.com/bdistin/fs-nextra.git','version':'6565c81'},
        {'url':'https://github.com/expressjs/body-parser.git','version':'480b1cf'},
        {'url':'https://github.com/tj/commander.js.git','version':'327a3dd'},
        {'url':'https://github.com/webpack/memory-fs.git','version':'3daa18e'},
        {'url':'https://github.com/isaacs/node-glob.git','version':'f5a57d3'},
        {'url':'https://github.com/reduxjs/redux.git','version':'b5d07e0'},
        {'url':'https://github.com/webpack-contrib/css-loader.git','version':'dcce860'},
        {'url':'https://github.com/kriskowal/q.git','version':'6bc7f52'},
        {'url':'https://github.com/pillarjs/send.git','version':'de073ed'},
        {'url':'https://github.com/expressjs/serve-favicon.git','version':'15fe5e3'},
        {'url':'https://github.com/expressjs/morgan.git','version':'19a6aa5'},
        {'url':'https://github.com/expressjs/serve-static.git','version':'94feedb'},
        {'url':'https://github.com/facebook/prop-types.git','version':'d62a775'},
        {'url':'https://github.com/expressjs/compression.git','version':'3fea81d'}]
def main(repos):
    for repo in repos:
        cwd = os.getcwd()
        
        cp = subprocess.call(['git', 'clone', repo['url']])
        if cp == 0:
            os.chdir(os.path.basename(repo['url']).replace('.git', ''))
            subprocess.run(['git', 'checkout', repo['version']])
            os.chdir(cwd)


if __name__ == '__main__':
    main(repos)