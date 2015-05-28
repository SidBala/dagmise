# dagmise

A directed acyclic graph of promises.

## Example

```javascript
var whenode = require('when/node');
var fs = whenode.liftAll(require('fs')); // make node fs functions promise like
var marked = require('marked');
var jade = require('jade');

dag.task('contents.md', function () {
    return fs.readFile('contents.md', 'utf8').then(marked);
});

dag.task('template.jade', function () {
    // resolve to a comiled jade template that we can later pass the rendered markdown as locals to.
    return fs.readFile('template.jade', 'utf8').then(jade.compile);
});

// index.html depends on contents.md and template.jade
dag.task('index.html', ['contents.md', 'template.jade'],
    function (target, contents, template) {
        // target === 'index.html'
        return fs.writeFile(target, template({ contents: contents }));
    });

dag.make('index.html');
```


`dag.make` returns a pending promise that will be resolved when `'index.html'`'s task and all its depenencies have been resolved.

When a task is executed when walking the graph for dependencies, the node's value (see [dager](https://github.com/spelufo/dager)) is replaced by the promise, so subsequent visits to the node will not trigger repeated execution of the task, instead they will yield the same promise it gave the first time. For this reason, running make again will produce the same value, without reexecution of any of the tasks.

`dag.update('node')` will revert the node's task and those of the nodes that depend on that task to their unrun starting state. `dag.reset()` will revert all the nodes. These methods are synchronous and only succeed if there are no "makes" in progress. Their return value is a boolean indicating success or failure.