---
title: Autonomous Response Codes
date: 2025-3-26
tags: computer-vision amorphous-computing
layout: post
---

![](/assets/autonomous-response-qr-show.jpg)
_(I removed people from the photo to respect their privacy so there's some AI fill in the bottom of the photo above)_

A week and a half ago the [QR Show exhibition](https://qrshow.nyc/retrospective.html) happened at the Recurse Center and
I participated with this project, which is an adaptation of ideas that I've been tinkering with on and off for more than
a year.

In a nutshell, the concept is to have a computer look for QR codes and run the contents of any that it finds as source
code in a simple language that allows sensing, decision-making, and actions relative to each QR code. The main action
that can be taken is to create other QR codes. With this infrastructure in place the QR codes can be thought of as
agents, like little robots or biological cells. As they are evaluated by the system they can create emergent patterns
and interactive behaviors. It's sort of like a tangible relative of cellular automata.

# QR Code Language

There is a lot of creative freedom in the design of the language for the codes. I kept things very simple for this
version and created a simple Lua DSL. The content of each found code is run in a
[sandbox](https://github.com/kikito/lua-sandbox/) with a context that contains functions which let the codes interface
with their environment and express common behaviors concisely. Here are the essentials:

A 2D coordinate system is initialized at the start of evaluation to be at the center of the QR code, aligned with its
rotation, and in screen-space scale (i.e. 1 means 1 pixel). The behavior of several of the functions below depends on
or can modify the current state of this coordinate system.

Constants:
* **ME**: Content of this QR code as text.
* **SZ**: Screen-space size of the QR code.
* **OV**: Bigger than the size by enough whitespace margin to allow a code to be read. Useful for making new codes
nearby.

Functions:
* **nop()**: Does nothing.
* **rnd()**: `math.random`.
* **in_qr()**: Returns true if the current position is inside of a QR code.
* **t(x, y)**: Transform the coordinate system by X and Y.
* **r(deg)**: Rotate the coordinate system by the given number of degrees.
* **up()**, **down()**, **left()**, and **right()**: Just invoke `t(x, y)` to move by `OV` in the given direction.

I was modifying this language as I went along so you may see some examples containing different names.

# Examples

## Glider

A kind of ["glider"](https://en.wikipedia.org/wiki/Glider_(Conway%27s_Game_of_Life)) like in Conway's Game of Life can
be made using the following program:

```lua
t(0,-SZ/2);qr('nop()');t(0,SZ);qr('nop()');t(OV,-SZ/2);me();
```

<video src="/assets/autonomous-response-glider.mp4" loop autoplay controls muted></video>

It disables itself by covering itself with two new QR codes that do nothing. Then it replicates itself to the right.

## Random Replication to the Right

```lua
r(rnd(30)-15);t(OV,0);qr(ME)
```

Rotate a little bit and then replicate to the right.

<video src="/assets/autonomous-response-rand-replicate-right.mp4" loop autoplay controls muted></video>

You can see how the first one stays active so it overwrites its child, disabling both children. The same pattern repeats
every other code.

## Random Rotation, Replicate

```lua
r(rnd(360));t(OV,0);qr(ME)
```

Rotate anywhere in 360 degrees then move and replicate.

<video src="/assets/autonomous-response-rand-rotate-replicate.mp4" loop autoplay controls muted></video>

This is maybe my favorite program that I've found so far, because it's so simple but still creates a surprising emergent
pattern. If a code is overwritten then it is likely that neither code will be read. So there's a kind of competition.
The children that a code makes act as a barrier which other codes won't be able to replicate across. So any that manage
to form a wall around them early on will continue to survive and make more children that can help to make the wall
better. Eventually only those codes remain active, resulting in arcs and circles forming in the overall field.

![](/assets/autonomous-response-rand-rotate-replicate-1.jpg)
![](/assets/autonomous-response-rand-rotate-replicate-2.png)

# Interactivity

Because the system is looking for QR codes it can loop through the real world. The computer doesn't need to make the
codes to know about them. So we can bring our own on paper if we want to. This allows for a simple kind of
interactivity. That was one of the aspects that attracted me in the beginning, because I was looking at projects like
[Dynamicland](https://dynamicland.org/) and [Folk Computer](https://folk.computer/) and wondering what they would be
like if the "paper programs" held the actual source code for the programs instead of just using the paper artifacts as
identifiers referencing code held in a computer somewhere.

An implementation note: to make this work you need to know how to map the QR codes you find in the camera image to the
screen coordinates. I accomplished this by having a calibration mode that renders a checkerboard which can be
automatically detected by OpenCV. After that I have the location of the inner corners of the checkerboard in the camera
image and I know where I drew them on the screen, so I can ask OpenCV to find a homography between them. Then I can hold
onto that homography and whenever I find the outline of a code I use it to warp those points into screen space.

## Paint Brush

```lua
move(0,-SZ);qr('nop()')
```

No-operation codes serve as the paint.

<video src="/assets/autonomous-response-painting.mp4" loop autoplay controls muted></video>

## Greedy Growth

```lua
t(0,-OV);me();t(0,2*OV);me();t(-OV,-OV);me();t(2*OV,0);me()
```

It just replicates in every direction, acting as a flood-fill.

<video src="/assets/autonomous-response-greedy-growth.mp4" loop autoplay controls muted></video>

# Constraints

Here are some arbitrary constraints I imposed on this system:
* Local sensing and action - Even though a QR code could ask for a new one to be made far away, or look far away for
other codes, I didn't want to allow that so there would be a stronger mapping to physical agents like robots and cells.
* Creating new codes is like putting down a sticker - This was a simplification for the QR Show implementation. It's
trivial on a screen/projection to white out an area. But in an implementation where codes are physically printed, like
the ones I discuss below, it's much harder to do that.
* No compression of code contents - There is pressure to minimize the amount of data in the codes because it directly
impacts their size on a limited canvas. Bigger codes means fewer codes and smaller patterns. I could have implemented a
byte code and run the contents through some compression algorithm. But I wanted it to be possible for someone to scan
the codes and figure out what was going on from the text.

# Future Work: More Physical

Originally I set out to implement this project in a different way. Instead of projecting the QR codes I wanted to print
them physically. That way the state of the system would naturally persist. If you took the substrate with the codes out
of the system it would sit inert until you brought it back, whether that's in a minute or 100 years. In a way I think
that's similar to the role of DNA in biology.
On it's own DNA [can potentially survive for millions of years](https://doi.org/10.1038/s41586-022-05453-y), but without
a host it's just an interesting inert polymer. Once brought back into the context of the right machinery it can continue
evolving step-by-step, generation-by-generation.

Making this persistent version is a little more work. I'm going to keep working on it. For now here are some of the
steps I've already taken and my ideas for the next ones.

<video src="/assets/autonomous-response-plotting-qr-codes.mp4" loop autoplay controls muted></video>

An early prototype was implemented as a web app that could talk to an AxiDraw pen plotter over WebSerial to print the
codes. But plotting QR codes is painfully slow and I quickly realized that was much less interesting because any kind
of real-time interactivity would be impossible.

When I come back to this I think I'll use a custom inkjet printer (like [this one](https://www.are.na/block/35012594)
that I recently built) so the codes can each be printed in a few seconds. Ideally it's at a very large scale, because
the QR codes need to be big enough to encode the programs as well as being readable from a camera. And then you want as
much space as possible for patterns to develop. I am thinking about either using a large custom XYZ gantry or my Kuka
KR 16 robot arm. Another possibility that is much harder but allows even larger scale would be to use a mobile robot.
Then it could roam over a large space like a warehouse floor evaluating codes. I've built the robot but putting the rest
of the pieces together still represents a lot of time and effort.

Scanning the codes is also an important challenge. Early on one of the other prototypes I made was an Android app which
used ARCore and OpenCV to find and decode QR codes in a real-world coordinate space. I was hoping that it would be
accurate enough that I could just have the scan step be me manually waving the phone across a large paper/canvas and
then the print system could go and fill in any new codes. But in practice the ARCore tracking was not accurate enough,
on the order of centimeters instead of millimeters. The more practical thing would probably be to mount a camera on the
gantry or robot arm and just rely on the motion system's coordinate system. I did something like that to generate
[this animation](https://www.are.na/block/27925860).

Another path is exploring other types of codes. And making a large scale simulation to study the design space before
doing it for real. But all these things will have to wait for another day.

---

![](/assets/autonomous-response-running-man.jpg)
