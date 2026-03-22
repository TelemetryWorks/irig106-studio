That folder is for Web Worker entry files.

So:

app/
├─ workers/
│  └─ analysis-worker.js

means:

workers/ contains background browser worker scripts
analysis-worker.js is one worker script dedicated to heavy analysis tasks
What a worker is

A Web Worker is JavaScript running in a separate browser thread/context from the main UI thread.

Without a worker:

Button click -> JS on main thread -> heavy work -> UI freezes

With a worker:

Button click -> main thread sends message -> worker does heavy work -> worker sends result back

So the worker exists to keep the UI responsive.

Why it belongs in workers/

It is separated from normal UI code because it is a different runtime context.

A worker:

does not manipulate the DOM directly
does not render UI
communicates by messages
is usually started by the main app code

So analysis-worker.js is not just another feature file. It is a background execution entry point.

Why analysis-worker.js

That filename means:

this worker handles analysis jobs
likely calls Rust/Wasm or other heavy logic
processes data away from the UI thread

Examples of work that might go there:

parsing large IRIG 106 files
scanning packets
decoding channels in bulk
running expensive transforms
computing statistics
preparing export data
Physical architecture
Browser tab
├─ Main UI thread
│  ├─ HTML/CSS rendering
│  ├─ event handlers
│  └─ app state / UI updates
└─ Worker
   └─ analysis-worker.js
      ├─ receives job message
      ├─ runs heavy logic
      └─ posts result/progress back
How it is used

Your normal app JS might do something like:

const worker = new Worker("/workers/analysis-worker.js", { type: "module" });

worker.postMessage({
  type: "run-analysis",
  payload: { fileId: "abc123", channelId: 7 }
});

worker.onmessage = (event) => {
  const { type, payload } = event.data;
  if (type === "analysis-complete") {
    console.log(payload);
  }
};

And inside analysis-worker.js:

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === "run-analysis") {
    const result = doHeavyWork(payload);

    self.postMessage({
      type: "analysis-complete",
      payload: result
    });
  }
};
Why this matters for your app

Earlier we talked about these deployment stages:

Browser Wasm
Browser Worker + Wasm
Server-native Rust
Server-side Wasm

This folder is part of the Browser Worker + Wasm stage.

That means:

the compute still runs on the user's machine
but not on the UI thread
so the app remains responsive while doing large work
Why not put it under js/

You could, but separating it makes the architecture clearer.

For example:

app/
├─ src/
│  └─ js/        <- UI/app code
├─ workers/      <- background execution entry points

This makes it obvious which files:

run in the browser UI context
run in a worker context

That separation is helpful because workers have different rules and capabilities.

Better naming for your project

For irig106-studio, you may eventually want more than one worker. For example:

app/
├─ workers/
│  ├─ analysis-worker.js
│  ├─ decode-worker.js
│  └─ export-worker.js

But starting with one worker like analysis-worker.js is a good pattern.

Plain meaning

This line:

│  ├─ workers/
│  │  └─ analysis-worker.js

means:

“This project has a browser background worker used for heavy analysis tasks so the main UI does not freeze.”

For your app, that is where I would put code that offloads expensive IRIG 106 processing from the main thread.

I can also show you where analysis-worker.js should connect to wasm-engine.js and worker-client.js in the folder layout.

If we do this

app/
├─ workers/
│  ├─ analysis-worker.js
│  ├─ decode-worker.js
│  └─ export-worker.js

Do I need multiple WASM apps?
Thought for a couple of seconds

No — not necessarily.

Those are multiple worker entry points, not automatically multiple Wasm apps.

The workers are just different background “operators.” They can all use:

the same single Wasm module
the same Rust core
different JS worker wrappers
The usual pattern

You would typically have:

Rust codebase
   ↓ compile
one Wasm package/module
   ↓ loaded by
analysis-worker.js
decode-worker.js
export-worker.js

So the structure is more like:

app/
├─ workers/
│  ├─ analysis-worker.js
│  ├─ decode-worker.js
│  └─ export-worker.js
├─ src/
│  └─ js/
│     └─ services/
│        └─ wasm-engine.js

crates/
├─ irig106-core/
└─ irig106-wasm/

where each worker imports the same Wasm-facing JS loader.

What changes between workers

Usually the workers differ by:

what messages they accept
what orchestration they do
which Wasm exports they call
how they report progress/results

Not by having separate Wasm builds.

Example:

analysis-worker.js calls run_analysis()
decode-worker.js calls decode_channel()
export-worker.js calls export_selection()

All from the same Wasm module.

When one Wasm module is enough

One Wasm module is enough when:

all features come from the same Rust codebase
startup/load size is acceptable
you want simpler build/release management
the workers are just different entry points into the same engine

This is the default choice I would recommend first.

When multiple Wasm modules might make sense

You might split into multiple Wasm builds if:

1. Size becomes a real problem
Maybe export code pulls in heavy dependencies that most users do not need.

2. Capabilities are truly separate
For example, one module is only for decoding and another is only for export/transforms.

3. You want stricter isolation
Different workers only get the minimum code they need.

4. Build targets differ
Less common, but possible.

That would look more like:

crates/
├─ irig106-wasm-analysis/
├─ irig106-wasm-decode/
└─ irig106-wasm-export/

But that adds complexity:

more build outputs
more approval surface
more version coordination
more packaging work

So I would not start there unless you have a strong reason.

Best starting point for your project

For irig106-studio, I would start with:

one Rust core crate
one Wasm crate
multiple workers if needed

Like this:

crates/
├─ irig106-core/
└─ irig106-wasm/

app/
├─ workers/
│  ├─ analysis-worker.js
│  ├─ decode-worker.js
│  └─ export-worker.js

That gives you:

one source of truth for logic
one Wasm build artifact
multiple background execution paths
Another option: one worker, multiple job types

You may not even need multiple workers at first.

You could have:

app/
├─ workers/
│  └─ engine-worker.js

and send different messages:

{ type: "analyze", payload: ... }
{ type: "decode", payload: ... }
{ type: "export", payload: ... }

This is often simpler.

So the two good starting designs are:

Simpler
one worker
one Wasm module
Slightly more organized
multiple workers
one Wasm module

I would avoid:

multiple workers
multiple Wasm modules

until you know you need that split.

Rule of thumb

Think of it like this:

Workers = execution lanes
Wasm module = engine

You can have many execution lanes using the same engine.

So the answer is:

No, multiple workers do not mean multiple Wasm apps.
For your case, start with one Wasm module and only split it later if size, isolation, or build concerns force it.

A good default for irig106-studio is probably:

app/
├─ workers/
│  └─ engine-worker.js

with one shared Wasm module underneath.

Small nuance in wording - you said one wasm module but does the worker spawn multiple instances of the one wasm module?
Thought for a second

Yes — usually each worker loads its own instance of the same Wasm module.

So there are two different ideas:

one Wasm module artifact = one .wasm file / one build output
multiple Wasm instances = separate in-memory loaded runtimes of that same file
Physical picture

If you have:

app/
├─ workers/
│  ├─ analysis-worker.js
│  ├─ decode-worker.js
│  └─ export-worker.js

and all three use the same irig106_wasm_bg.wasm, then at runtime it is often like this:

same wasm file on disk
   ↓
analysis worker -> loads instance A
decode worker   -> loads instance B
export worker   -> loads instance C

Same module file, separate live instances.

Why that happens

A worker is a separate JS execution context.
It has its own:

global scope
memory space
state
loaded module state

So when a worker imports and initializes Wasm, that initialization normally happens inside that worker, creating that worker’s own Wasm instance and memory.

What that means in practice

If worker A changes internal Wasm state, worker B does not automatically see it.

Each worker’s instance is generally isolated.

That is usually good because:

fewer race conditions
simpler reasoning
workers can run independently

But it also means:

more memory use if many workers each load the same Wasm
no automatic shared in-memory Rust state between workers
Important distinction
One module

Means:

one compiled Wasm binary
one codebase/build artifact
Many instances

Means:

that binary is instantiated multiple times in memory
usually once per worker, sometimes once per page context too

So “one Wasm module” does not mean “one singleton runtime for the whole app.”

Can multiple workers share one single loaded Wasm instance?

Usually, not in the normal simple architecture.

Workers do not generally share one live Wasm instance object across contexts the way you might hope.

The normal model is:

same source .wasm
separate instantiation per worker

There are advanced patterns involving shared memory or central orchestration, but those are not the default starting point and add complexity.

Best mental model

Think of it like this:

Wasm module file = blueprint
Wasm instance = actual machine built from that blueprint

You can build several machines from one blueprint.

For your project

For irig106-studio, the likely progression is:

If you use one worker
one worker
one Wasm instance in that worker
If you use three workers
three workers
likely three Wasm instances
all created from the same Wasm file
If the main UI thread also uses Wasm directly
plus one more instance there

So you could end up with:

main thread wasm instance
analysis worker wasm instance
decode worker wasm instance
export worker wasm instance

all based on the same build artifact.

Design implication

If you want shared truth, do not rely on in-memory Wasm state spread across workers.

Instead, keep shared truth in one of these:

JS app state on the main thread
explicit messages between workers and main thread
indexedDB/local storage for persistence
later, a server or native backend

That keeps the system understandable.

Recommendation

For your first version, prefer:

one worker
one Wasm instance inside that worker
UI talks to worker by messages

That keeps the model simple and avoids multiple copies until you actually need concurrency separation.

So the precise answer is:

Yes — the usual behavior is that each worker spawns or initializes its own instance of the same Wasm module, not a different Wasm app.

Ok final question - does the wasm app provide the connection to the binary file we want to interact with in the browser? of is there some other method which is used due to browser security?  if the wasm app does provide the connection how would multiple workers work in this case?

I’m verifying the browser file-access model and worker handoff details so I can answer exactly where the “connection” to a local binary file really lives.

Thought for 10s

Usually no, the Wasm app does not directly “open a path on disk” by itself the way a native app would.

In the browser, access to a local binary file normally starts with a browser-approved file access flow such as:

a file input
drag and drop
a file picker like showOpenFilePicker()

The browser then gives your app a File, Blob, or file handle object. MDN’s File API docs say web apps can access files when the user makes them available, for example via <input type="file"> or drag-and-drop. The File System Access docs similarly describe getting handles only after the user selects files through a picker.

So the real model is:

User grants access
   ↓
Browser gives JS a File / Blob / FileHandle
   ↓
JS passes bytes or handles to Wasm
   ↓
Wasm parses/decodes/analyzes

That means the security boundary is the browser, not Wasm. Wasm runs inside the browser sandbox and works with data the browser has already allowed the page to see.

What “connection to the file” really means

In browser terms, there usually is not a permanent native-style “open file descriptor” that your Rust/Wasm code owns directly.

What you generally have is one of these:

a File object representing the user-selected file
a Blob
a FileSystemFileHandle if you are using the File System Access API

Then you read data from that object, often into an ArrayBuffer, and hand it to Wasm for parsing. MDN documents FileReader, Blob.arrayBuffer(), and file handles as the browser’s mechanisms for reading local file contents.

So the answer is:

Wasm usually provides the parsing/processing engine, not the initial file permission or native file connection.
Browser APIs provide the file access.

Typical patterns
Pattern 1: Main thread picks file, reads bytes, sends to Wasm

This is the simplest mental model.

User selects file
   ↓
JS gets File object
   ↓
JS reads bytes
   ↓
bytes passed into Wasm
   ↓
Wasm processes them
Pattern 2: Main thread picks file, hands file to worker

This is often better for large files.

User selects file
   ↓
Main thread gets File object
   ↓
postMessage(file) to worker
   ↓
worker reads bytes
   ↓
worker calls Wasm
   ↓
worker posts results back

This works because data exchanged with workers uses the structured clone algorithm, which MDN documents as the mechanism used for passing values between workers with postMessage().

Can workers access the file too?

Yes, with some caveats.

Workers can work with file-related objects. MDN documents that FileReaderSync is available in workers, and that FileSystemFileHandle / FileSystemHandle are available in workers as well.

That gives you a few options.

Option A: Main thread reads, sends raw bytes to worker

Good for simpler designs, but for very large files it can mean moving a lot of data around.

Option B: Main thread sends File to worker, worker reads it

Often a better pattern for responsiveness. The UI obtains the file from the browser, then the worker reads and processes it. MDN notes workers can perform background tasks and can exchange data via postMessage().

Option C: Main thread obtains a file handle, worker uses the handle

Possible with the File System Access API where supported, but showOpenFilePicker() itself is a window method and MDN flags it as experimental and browser-dependent, so I would treat it as progressive enhancement rather than your baseline.

How multiple workers fit in

If you have:

app/
├─ workers/
│  ├─ analysis-worker.js
│  ├─ decode-worker.js
│  └─ export-worker.js

the key question is who owns the file object / bytes and how they are distributed.

Model 1: Main thread is the file-access coordinator

This is the safest and clearest starting point.

UI/main thread
  ├─ gets file from browser
  ├─ stores metadata
  ├─ sends work requests
  └─ routes chunks/handles to workers

workers
  ├─ analysis worker
  ├─ decode worker
  └─ export worker

In this model:

the main thread handles user permission and selection
workers do processing
Wasm instances in workers parse/analyze bytes

This is usually the best first design.

Model 2: Each worker receives the same File and reads what it needs

Possible, but this can become wasteful if several workers independently reread the same big binary.

Model 3: One worker owns file reading, other workers receive derived chunks/results

This is often the most scalable browser-side design.

main thread
   ↓ file selected
engine worker
   ├─ reads file/chunks
   ├─ calls Wasm parser
   ├─ builds indexes
   └─ sends derived work/results onward

That is why earlier I suggested that one worker may be better than three at first.

What I would recommend for irig106-studio

For a binary-heavy IRIG 106 browser app, I would start with:

User selects file
   ↓
main thread receives File
   ↓
post File to one engine worker
   ↓
worker reads file/chunks
   ↓
worker calls one Wasm instance
   ↓
worker returns parsed metadata, indexes, and results

So:

browser API handles file access permission
worker handles heavy reading/parsing
Wasm handles binary interpretation and compute
UI thread stays responsive

That avoids several common problems:

freezing the UI
duplicating file reads across multiple workers
trying to share mutable in-memory parser state across worker boundaries
The important practical distinction

Do not think of Wasm as “opening the local file.”

Think of it as:

Browser grants access → JS/worker obtains bytes/handle → Wasm interprets bytes

That is the clean browser-safe mental model.

If you later use multiple workers

Then I would structure it like this:

Best starting version
one selected file
one coordinator/engine worker
one Wasm instance in that worker
Later, if needed
coordinator worker reads/chunks/indexes the file
specialized workers receive chunks or derived tasks
each specialized worker may have its own Wasm instance
shared truth stays in main-thread state or explicit messages

That is much easier than letting three workers all independently “own” the file.

So the direct answer is:

No, the browser security model means Wasm is usually not the thing that directly acquires file access permission. The browser gives JS/worker a File/Blob/handle after user action, and Wasm processes the bytes. With multiple workers, the usual approach is that the main thread or one coordinator worker owns file access flow, then distributes work to workers rather than each worker independently opening the file.

is there a zero-copy method?

I’m checking the current browser-side limits around File, workers, transferable buffers, and shared memory so I can answer the “zero-copy” part precisely.

Thought for 7s

Yes, but only in specific parts of the pipeline — not usually as a perfect end-to-end “disk file to Wasm with zero copies anywhere.”

The browser gives you a few levels of “copy avoidance”:

Avoid copying between main thread and worker by transferring an ArrayBuffer instead of cloning it. MDN says transferable objects move ownership to the destination context, and the sender can no longer use the original buffer. Typed array docs explicitly describe this as useful for moving data between execution contexts without copying.
Share memory between contexts with SharedArrayBuffer, but that requires a cross-origin isolated environment. MDN says SharedArrayBuffer use is gated by cross-origin isolation and related headers/permissions.
Read inside the worker so you do not first read on the main thread and then move the bytes again. Workers can handle background tasks, and MDN documents file access mechanisms and worker support for synchronous file access patterns in workers with FileSystemFileHandle examples.

The important catch is this:

Reading a File with Blob.arrayBuffer() or FileReader.readAsArrayBuffer() still produces an ArrayBuffer containing the file’s data in memory. That is a file-read step, not a magical direct alias of disk bytes.
So true zero-copy from disk into Wasm memory is generally not the normal browser mental model.
The practical answer for your app
Best low-complexity option

Have the worker read the file itself and then process it with Wasm.

User picks file
   ↓
Main thread gets File / handle
   ↓
Send File / handle to worker
   ↓
Worker reads bytes
   ↓
Worker calls Wasm

That avoids:

reading on main thread
then copying again to worker
then parsing

It is not guaranteed to be “zero-copy” at every layer, but it is usually the fewest unnecessary copies and keeps the UI responsive.

Best “no extra copy between main thread and worker”

If the main thread already has an ArrayBuffer, send it like this:

worker.postMessage({ buffer }, [buffer]);

That transfers ownership instead of cloning the bytes. After transfer, the sender’s buffer is detached. MDN explicitly describes this behavior for transferable objects and postMessage().

Best shared-memory option

Use SharedArrayBuffer if you truly need multiple contexts to work on the same memory region. But this comes with deployment constraints because cross-origin isolation is required.

For irig106-studio, what I would do

I would start with this order of preference:

1. One worker reads the file and calls Wasm
Best first architecture. Fewest moving parts, UI stays responsive, no pointless main-thread copy path.

2. If main thread must read first, transfer the ArrayBuffer
This avoids an extra copy when handing work to the worker.

3. Use SharedArrayBuffer only if you truly need shared concurrent access
Powerful, but more operationally demanding.

One more nuance: Wasm itself

Even if you avoid copies between JS contexts, there can still be a copy boundary when moving data into how your Wasm code expects memory to be laid out, depending on your binding approach and API design. That is why a chunked/streaming design is often better than trying to load one giant file buffer into one huge Wasm-owned block.

MDN also notes readable byte streams are designed for efficient zero-copy transfer patterns, which points toward streaming/chunking as a good direction when files get large.

Bottom line

Yes, there are zero-copy or near-zero-copy techniques in the browser, but usually only for specific boundaries.
For your case, the best practical pattern is:

browser grants file access
one worker reads the file
worker processes chunks with Wasm
results go back to UI
use transferred ArrayBuffers when bytes must cross contexts
reserve SharedArrayBuffer for advanced cases

That gives you the closest thing to zero-copy that is practical without making the architecture painful.

Do we need to update my UI Guidelines with any of this information? 
Thought for a second

Yes — a small update would help a lot.

Your current UI guidelines are strong at the architecture level, but they do not yet capture three implementation-important browser realities we clarified:

browser file access is permission-gated and starts in browser APIs, not “inside Wasm”
workers are separate execution contexts and usually create separate Wasm instances
“zero-copy” should be treated as a performance goal at specific boundaries, not assumed globally

I would not rewrite the whole document. I would add one short section and lightly expand two existing sections.

What to add

Add a new section near Wasm Integration Rules or Preparing for Heavy Compute.

Recommended new section
## Browser File Access and Worker Model

In the browser, local file access begins with browser-approved user actions such as:

- file input
- drag and drop
- file picker APIs where supported

The browser provides a `File`, `Blob`, or file handle to JavaScript or a worker after the user grants access.

Rust/Wasm is responsible for parsing, decoding, validation, and computation on the provided data. Rust/Wasm should not be treated as the layer that directly acquires local file permissions.

### File access rules

- User-approved browser APIs must initiate access to local files.
- The UI or a worker may receive `File`, `Blob`, or file handle objects.
- Wasm should operate on bytes, chunks, or structured request objects passed through the application service boundary.
- Do not design around native-style file path access in the browser.

### Worker rules

Workers are separate browser execution contexts.

This means:

- workers do not manipulate the DOM
- workers communicate through messages
- each worker usually initializes its own instance of the shared Wasm module
- workers should not rely on shared in-memory Rust state unless explicitly designed for it

### Default processing model

The preferred browser processing model is:

1. the user grants file access
2. the main thread receives the browser file object
3. a worker performs heavy reads and processing when needed
4. the worker calls the Wasm engine
5. the worker posts progress and results back to the UI

### Performance rules

- Avoid unnecessary copying of large buffers between contexts.
- Prefer reading large files in the worker when practical.
- Use transferable buffers when moving large binary data between the main thread and workers.
- Treat zero-copy as an optimization goal for specific boundaries, not as an assumed end-to-end guarantee.
- Prefer chunked or streaming processing for large files.
What to revise slightly
1. Update Wasm Integration Rules

Add one sentence like:

Wasm should be treated as the parsing and computation engine, while browser APIs remain responsible for user-mediated file access and permission boundaries.
2. Update Preparing for Heavy Compute

Add one sentence like:

Worker-based execution should assume separate Wasm instances per worker unless a more advanced shared-memory design is explicitly chosen.
3. Update Browser Responsiveness Rules

Add one bullet:

- large binary file reads should occur in a worker when practical
Why this matters

These additions prevent future confusion in three areas:

someone assuming Rust/Wasm can directly open local files in-browser like a native app
someone assuming multiple workers share one live Wasm runtime/state
someone over-designing around “zero-copy everywhere” instead of building a practical chunked pipeline
