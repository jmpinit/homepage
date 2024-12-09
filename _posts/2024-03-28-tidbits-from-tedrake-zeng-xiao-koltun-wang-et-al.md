---
title: Tidbits from Tedrake, Zeng, Xiao, Koltun, and Wang et al.
date: 2024-03-28
tags: robotics ml
---

I spent the whole day just following my curiosity watching lectures and reading
papers.  If you take a look it's probably just best to skim through and see if
anything catches your eye. I saw a few interesting connections that I tried to
highlight. The first three lectures are great overviews of the general recent
big trends in robot intelligence. The drone lecture felt like a bit of a
refreshing detour into concrete application of DL techniques. Then GLiDE came
and hurt my brain but then eventually resolved into what looks like a really
neat answer to some questions I had from ALOHA/ACT about why it is bad at
recovering from big failures and how that could be improved upon.

# Video: [Princeton Robotics - Russ Tedrake - Dexterous Manipulation with Diffusion Policies](https://www.youtube.com/watch?v=whpK0HDtOJ0)

- Discusses work where their team at Toyota spent a long time (~3 years) setting
up a stack of classical methods to do well at dextrous manipulation tasks like
loading a dishwasher, then goes on to show how it was possible to do
approximately the same thing in ~3 hours with behavior cloning.
- Intuitive explanation of diffusion is that it’s learning the euclidean
distance to the data manifold
([timestamp](https://youtu.be/whpK0HDtOJ0?t=1122))
    - This reminds me of "[Diffusion models from scratch, from a new theoretical
    perspective](https://www.chenyang.co/diffusion.html)”, which gives a really
    clean framework for understanding what diffusion models are doing.
- They are using the diffusion model to predict the next 1.6s of trajectory and
then they execute for 0.8s before running a new prediction. The choice of these
numbers is a practical trade-off between wanting to be as closed-loop as
possible and the current limitation that it's slow to run the diffusion process.
- Forecasting the future x seconds works better than just predicting the next
step at each step. Might help navigate through solutions that are multi-modal?
- [Russ Tedrake’s publications](https://groups.csail.mit.edu/locomotion/pubs.shtml)
- RT-1 and RT-2 producing discrete actions “is a big deal” in the sense that it
might be a problem / doesn’t feel right.
- [Some discussion of ACT here](https://youtu.be/whpK0HDtOJ0?t=2065) - “I think
that could work too”

# Video: [Andy Zeng: From words to actions](https://m.youtube.com/watch?v=jgujjU4IYAs) ([slides](https://slides.com/andyzeng/2023-mila-talk))

- TossingBot[^1], Transporter Nets[^2], and Implicit Behavior Cloning[^3] are
interesting examples of closed-loop vision-based deep learning policies.
- They set up robot farms for collecting training data and expected to see a log
curve where as the amount of data increased the number of tasks they could do
increased more and more rapidly. But instead they saw a line. So that might mean
they just need some more orders of magnitude of data before it starts looking
like that.
- Existing deep learning methods are good at interpolation but not
extrapolation. Comment: I see this observation being made over and over again.
It is directly related to the issue of generalization. No one seems to know what
the right answer for this is yet. But many are optimistic that it's good enough
to interpolate if your dataset is so huge that everything you might want to do
can be reached by interpolating within it. In the same way that it has worked
for image and text generative models. E.g. [RFM-1 project at
Covariant](https://covariant.ai/insights/introducing-rfm-1-giving-robots-human-like-reasoning-capabilities/). Andy gives
a good example of this approach in action using [the Abraham Lincoln
example](https://youtu.be/jgujjU4IYAs?t=806).
- SayCan[^4], Socratic Models[^5], and Code as Policies[^8] are examples of
using LLMs for common sense in a high level robotic planning context.
- Explanation of Code as Policies[^8] - using
LLMs to recursively write code to control robots to achieve goals specified in
natural language.
    - You can have the LLM write code that directly invokes control APIs like
    `move_forward(1.3)`, but it's also very effective to have it write code
    describing reward functions that are then used in RL[^7]. 
- Some cool examples of tinkering with LLMs in robots at a lower level, like using them to map and then semantically query what is in a space[^6] or getting them to adjust
their outputs based on a level of certainty[^9].
- PaLM-E[^10] kind of doubles-down on the same ideas all together to get more
generality and the ability to work with more types of input.
- Large Language Models as General Pattern Machines[^11] shows how LLMs can be
surprisingly good at low level control problems without any special
modifications. They aren't practical for this use right now but it's spooky they
can do so well even though they have mostly just been shown human language data.
It reminds me of another observation about spooky powers that LLMs seem to have
made in [Can Wikipedia Help Offline Reinforcement
Learning?](https://arxiv.org/pdf/2201.12122.pdf), which was mentioned in
**Stanford CS25: V2 I Robotics and Imitation Learning** reviewed below.

[^1]: [TossingBot](https://tossingbot.cs.princeton.edu/)
[^2]: [Transporter Networks: Rearranging the Visual World for Robotic
Manipulation](https://transporternets.github.io/)
[^3]: [Implicit Behavioral Cloning](https://implicitbc.github.io/)
[^4]: [Do As I Can, Not As I Say: Grounding Language in Robotic
    Affordances](https://say-can.github.io/) a.k.a. SayCan
[^5]: [Socratic Models Composing Zero-Shot Multimodal Reasoning with
    Language](https://socraticmodels.github.io/)
[^6]: [Visual Language Maps for Robot Navigation](https://vlmaps.github.io/) -
This reminded me of [OK-Robot](https://ok-robot.github.io/) where you can tell a
robot to move things around in a space, and yes they cite this in that paper.
[^7]: [Language to Rewards for Robotic Skill
Synthesis](https://language-to-reward.github.io/)
[^8]: [Code as Policies: Language Model Programs for Embodied
Control](https://code-as-policies.github.io/)
[^9]: [Robots That Ask For Help: Uncertainty Alignment for Large Language Model
Planners](https://robot-help.github.io/)
[^10]: [PaLM-E: An Embodied Multimodal Language Model](https://palm-e.github.io/)
[^11]: [Large Language Models as General Pattern
Machines](https://general-pattern-machines.github.io/)

---

# Video: [Stanford CS25: V2 I Robotics and Imitation Learning](https://www.youtube.com/watch?app=desktop&v=ct4tdyyNDY4)

- Google Brain chose multi-task imitation learning to achieve >90% success and
scale with more data
- Language might work as a universal glue
- Some discussion of RT-1
- References SayCan[^4] as an example of how knowledge is conditioned on
language
- Multi-modality in the sense of different ways to go about solving the same
problem
- Language models for robotics - need to get the language models to speak “robot
language”. This was the motivation for SayCan[^4].
- VLMs can be trained to be good-enough instruction labelers. Even if they do
poorly it still helps and is many orders of magnitude cheaper than using humans
for the task.
- Inner Monologue paper[^12]
- DIAL[^13]
- Can Wikipedia Help Offline Reinforcement Learning?[^14]
- Transformer context length limitation is very significant in the robotics
context, because it limits the duration of video that can be passed in, the
number of cameras, etc.

[^12]: [Inner Monologue: Embodied Reasoning through Planning with Language
Models](https://innermonologue.github.io/)
[^13]: [Robotic Skill Acquisition via Instruction Augmentation with
Vision-Language Models](https://instructionaugmentation.github.io/) a.k.a. DIAL
[^14]: [Can Wikipedia Help Offline Reinforcement Learning?](https://arxiv.org/pdf/2201.12122.pdf)

---

# Video: [MIT Robotics – Vladlen Koltun – A Quiet Revolution in Robotics Continued](https://m.youtube.com/watch?v=vNFTcD3QMn0) ([paper](https://www.nature.com/articles/s41586-023-06419-4))

This is about building a deep learning system that can train a policy which is
able to run onboard a racing drone and beat the best human pilots. I thought it
was interesting relative to the above videos in the following ways:

- He discusses some of the details about the implementation that made it
possible to run it on a real robot with significant performance constraints.
It's a mixture of work to get SOTA performance and work to make it practical.
- It's cool how they made the sim look like the real world very simply by
training on feature detections. The technique[^15] would be easy to apply in
other projects/contexts.
- They had initial success at the task with a pure simulation approach but it
was not enough to get them good enough to beat people. To cross the remaining
sim2real gap they trained an MLP to estimate the difference between sim and real
data and then fine tune on that.
- It's a good example of the teacher-student approach where they first train a
teacher in the sim using privileged information that the student policy will not
have access to on the real robot. Then the student is trained to predict what
the teacher would do based on only the information accessible on the real robot.
I was first exposed to this approach in predictive control systems for
quadraped robots[^16].

[^15]: [Driving Policy Transfer via Modularity and
Abstraction](https://arxiv.org/abs/1804.09364)
[^16]: [Learning robust perceptive locomotion for quadrupedal robots in the
wild](https://leggedrobotics.github.io/rl-perceptiveloco/)

# [Grounding Language Plans in Demonstrations Through Counterfactual Perturbations](https://sites.google.com/view/grounding-plans) (GLiDE)

The way I understand it is that they are trying to address the problem where an
RL system doesn't learn that there are only certain valid paths to a given goal
when the goal is reached by a long path. Like if a robot is given the task of
taking a soda can and dropping it in the garbage it might go successfully pick
up the can but if the can is knocked out of its gripper along the way it might
"recover" by just continuing on to the garbage with an empty gripper and then
making the motion to drop something there. Instead it should realize that the
goal will not be fulfilled if the can doesn't end up in the trash, so it should
pick the can back up. This issue [was discussed a bit here in Stanford CS25: V2
I Robotics and Imitation Learning](https://youtu.be/ct4tdyyNDY4?t=3159). It's
also a problem that I saw exhibited in the results from ACT[^17].

The "modes" discussed in GLiDE are like the states in a state machine. If the
policy doesn't follow the right transitions which are appropriate to the task
(e.g. empty gripper -> holding can -> drop in trash can) then the task won't be
completed successfully.

They construct a prompt that causes the LLM to generate a state machine for the
task, which is expressed by the user in natural language. The high level task
plan from the LLM will incorporate "common sense". But then the question is how
do you connect that to trajectories on the robot? The answer: A human runs
demonstrations where they complete the task successfully. Then this system
automatically generates "counterfactual" demonstrations that it thinks would
fail the task, supervised using another component that has been trained to
guess whether the overall goal of the task has been completed successfully
(e.g. is the soda can in the trash - Inner Monologue[^12] also had such a
 success detector). Taking the good and bad demonstrations together with the
"modes" guessed by the LLM (the states of the state machine) the system then
learns how the different parts of the demonstration trajectories fit the modes
from the LLM. That's the "grounding classifier". The end result is a system
that can look at what the robot is doing in real-time and guess where it is in
the state machine for the task, and use that knowledge to restart the task in
an appropriate place if it gets messed up.

This is super cool, because it provides a way to take advantage of the common
sense that an LLM has about the structure of tasks that involve many high level
steps (long horizon planning) without tinkering with the structure of the LLM
(so it works out of the box with, say, ChatGPT). It kind of learns to translate
that common sense into the real-time input->action space that the robot is
operating in. But on another level this still feels kind of clunky because of
the LLM prompting. How could this kind of thing be implemented down in a
continuous space where you don't have to pull the info out as text first? Like
more in the spirit of Large Language Models as General Pattern Machines[^11]?

[^17]: [Learning Fine-Grained Bimanual Manipulation with Low-Cost
Hardware](https://tonyzhaozh.github.io/aloha/)
