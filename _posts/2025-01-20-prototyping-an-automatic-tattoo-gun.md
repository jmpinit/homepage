---
title: Prototyping an Automatic Tattoo Gun
date: 2025-1-20
tags: robotics
layout: post
---

![](/assets/auto-tattoo-gun_prototype-overview.jpg)

Over the weekend I prototyped a tool for tattooing with a robot arm.

I think the idea got in my head almost ten years ago when I saw [this
project](https://www.theverge.com/circuitbreaker/2016/8/4/12376760/industrial-robot-tattoo) by two French designers
named Pierre Emm and Johan da Silveira at Autodesk's Pier 9 where they used a big industrial robot arm to make some
tattoos. They had previously [modified a Makerbot 3D printer to make tattoos](https://vimeo.com/143370566).

What would it take to make a good tattoo with a machine? At least:
- A way to move the tattoo gun around in space accurately.
- A way to know where the tattoo needs to be placed in space, like on a person's arm.
- A way to move the tattoo gun in a path that traces the outline of the tattoo. If the person is moving around then your
path needs to adjust also. Or you could plan out the path in advance and just make sure the body part doesn't move while
you are tracing it.
- A way to ensure the quality of the line you are creating. It at least depends on how deep the needles are going into
the skin, the type of skin you're tattooing on, how fast the needles are reciprocating, how fast the tattoo gun is
moving along the path, the type of ink and how much of it is available for the needles, and likely many other things
that a skilled tattoo artist would know.

Judging by photos and videos, it looks like the general approach that Pierre and Johan took was to start with a motion
system that could get the tattoo gun to follow a path which they precomputed. They added a contact sensor to provide
feedback about where the skin is and how deep the needles were going. On the robot arm they also had an extra linear
motion stage at the end which could move the gun towards or away from the skin. Maybe they were using that to adjust the
depth of the needles in real-time based on feedback from their contact sensor, or maybe it was just helping to execute
the preplanned motion.

Other examples of solutions for the same kinds of problems can be found in the surgical robotics space. A high profile
example is [the Neuralink R1 surgical robot](https://www.youtube.com/watch?v=-gQn-evdsAo), which also repeatedly stabs
needles into a person. But in that context it's inserting flexible electrodes into a brain. Still, the problems are
similar. That system has target locations it needs to reach relative to a squishy, moving, living surface. They can't
restrain the motion so the system needs to judge where the surface is continuously and update its plan. In the video I
linked it's mentioned that it uses an "OCT-based" system to get data about the structure of the brain surface 21 times
per second. OCT = [Optical Coherence Tomography](https://en.wikipedia.org/wiki/Optical_coherence_tomography).

Humans are really good at learning to do these sorts of tasks. Artists, craftspeople, surgeons, athletes, and etc. can
do incredibly subtle things with their eyes, hands, and brains. They adjust how they hold a tool to make the best use of
their body kinematics for controlling it, or understand how wet a brush is by how the paint on it reflects light, or
adjust their carving design on the fly to make use of a knot in the wood they found while working. Usually these skills
aren't the kind of knowledge that is taught. Maybe some words of wisdom help them start on the right solution manifold,
but the fine details come wordlessly through practice. Some of it may physically live outside the brain in the
limbs, hands, and skin. Shadows of the tools a person uses start amalgamating into the body plan they have for
themselves in their mind.

I'm in awe of the embodied intelligence humans are so rich with. My crude attempt at mimicry here is a partly a tribute
to it and partly another small step toward getting an understanding of it for myself.

## Prototyping

In the past I've worked on a bunch of painting machines, and trying to paint with robot arms (like you can see in
[this video reel](/project-reel.mp4)). I've tried adjusting the pressure on a brush by adapting the motion of a gantry
or robot arm directly in real-time using sensor feedback. A common problem is that the motion planner for the primary
motion system is something off-the-shelf that's not designed to incorporate real-time feedback. On a gantry you can hack
around this by disconnecting the last axis from the main motion controller and using an independent system for the
closed-loop control. With a robot arm you usually don't want to mess with the robot's internals so it's easier to add
an extra motion stage that you can connect to your closed loop controller. That's like what Pierre and Johan did with
the robot arm at Pier 9. I'm going to try the same.

I wanted to work quickly with what I had on hand, so I came up with a design for the prototype piece-meal by junk bin
diving. I found a geared DC motor, rack, and small linear slide rail to build a fast linear motion stage with. The robot
arm would be in charge of getting the tattoo gun close to the person and keeping it pointing normal to the skin surface.
The linear motion stage would then be able to quickly adjust the depth based on feedback from some kind of sensor.

For the sensor I needed something very accurate and reliable. My assumption is that fractions of a millimeter matter for
the tattooing depth, so my sensor would need to have at least that kind of resolution. The need for reliability ruled
out sensors I might otherwise reach for, like ultrasound, light-based ToF, or capacitive distance sensors. I didn't want
anything that might be fooled by interference, odd shapes, reflections, or liquid. Instead I decided to have something
touch the surface of the skin. By seeing how much it was displaced I would be able to figure out the current depth. But
how to measure the displacement? I wanted something very simple and easy to make with as few moving parts as possible. I
settled on using a 3D printed flexure structure with a little light blocking section sticking into a break-beam light
sensor.

Here's the prototype I made to test the idea:

<video src="/assets/auto-tattoo-gun_sensor_proto.mp4" loop autoplay controls muted></video>

I really like flexures because they are easy to make with 3D printers and laser cutters. They don't have any parts that
rub against each other so they don't wear out quickly.

With the sensor PoC working I moved onto wrapping it around the tattoo gun I bought:

<video src="/assets/auto-tattoo-gun_wraparound-sensor-distance-readout.mp4" loop autoplay controls muted></video>

This one took a couple of rounds of adjustment to get right. The flexure needed to be thin so the force required to
displace it would be small, but that made it so it was hard to clean the support material from the 3D print without
damaging it. At first the internal diameters were too small so it flexed outward when I put it on the tattoo gun, and
that shifted the little flag relative to the break-beam sensor causing it to not be centered. But after a few tweaks it
was working pretty well.

Next I moved onto the full assembly with a linear motion stage:

![](/assets/auto-tattoo-gun_actuator-proto-cad-overview.png)

3D printed and assembled on a UR5 robot arm with a simple untuned PID-loop:

<video src="/assets/auto-tattoo-gun_prototype-control-loop.mp4" loop autoplay controls muted></video>

It's sorta working! But it's going to need more iterations before it's usable for tattooing.

Deficiencies to resolve:
* The motor is way too weak to move the tattoo gun (which is surprisingly heavy) when the tool is vertical. I let the
magic smoke out of one of the motor driver chips on the board I'm using when I tried that. It really needs a bigger
motor and maybe a counterweight/spring to help balance it against gravity.
* The springiness in the displacement sensor results in a resonant frequency where it can just oscillate in space,
creating spurious readings that feed back into the control to maintain the resonance. Maybe I can add something to
physically damp the oscillation, and I can add a notch filter for the resonant frequency in the controller.
* The displacement sensor arm is going to need to be made of something stronger with an end that glides over skin
easily.
* I spent a while trying to naively tune the PID loop by fiddling around but it proved too difficult in the time I had.
It was very easy to induce strong oscillations. For actually tattooing it needs to be perfectly smooth but with a very
fast response. I have some ideas of where to start but I strongly suspect I'm blind to an obvious solution from
classical control theory and I should just pick up a textbook to find that. Or maybe you, dear reader, have ideas and
can <a href="mailto: hi@owentrueblood.com">send me a message</a>?

In my mind the closed loop tool system is the hard part of this project. With that in hand the overall workflow will
look like:

1. Make the art to tattoo and export it to SVG.
2. Post-process it with [vpype](https://github.com/abey79/vpype) to get a flat tool path.
3. Strap the person down so the target body part isn't going to move much for the rest of the process.  3D scan the body
part with real world scale. Could do this for free using photogrammetry via RealityCapture.
4. Splat the tool path onto the 3D scan.
5. Convert the tool path to G-Code.
6. Run the G-Code on the robot.

I already did a mock of steps 1-4 before I started working on the tool system. Here I am using Houdini to do the tool
path manipulation relative to the 3D scan:

<video src="/assets/auto-tattoo-gun_houdini-mockup.mp4" loop autoplay controls muted></video>
