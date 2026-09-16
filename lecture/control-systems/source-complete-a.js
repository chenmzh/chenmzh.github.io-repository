(function(){
const root=window.sourceComplete||{units:{}};
const U=root.units;
const S=(ppt,title,sources,html)=>({ppt,title,sources,html});

U['01']={
 note:'PPT 1.1–1.4 + B01 Introduction。主线页负责先建立 feedback 直觉；下面按 ETH PPT 顺序把动机、元件、课程组织和例子补齐。',
 sections:[
 S('1.1','Motivation · 为什么控制不是“算一个输入”这么简单',['L01 slides','L01 annotated','B01'],String.raw`
 <p class="cs-source-bridge"><strong>这节要补上的核心：</strong>控制的对象不是一个公式，而是一个“测量 → 决策 → 作用 → 再测量”的闭环过程。</p>
 <p>先看最朴素的 cruise control。司机或 controller 想要速度 $r$，但真正能施加的是油门/驱动力 $u$；车辆还受到坡度、空气阻力、载重变化等 disturbance。于是“给多少油门”不是固定答案，因为同一个 $u$ 在不同路况下会得到不同速度。</p>
 <div class="cs-derivation"><strong>从 Newton 定律到动态模型</strong><div class="step"><span>1</span><div>把速度记为 $v$，质量为 $m$。最简单的一阶模型是 $m\dot v=F_{drive}-b v+F_d$。</div></div><div class="step"><span>2</span><div>把 actuator command 记为 $u$，令 $F_{drive}=k_u u$。</div></div><div class="step"><span>3</span><div>得到 $\dot v=-\frac bm v+\frac{k_u}{m}u+\frac1mF_d$。这已经说明：当前速度会影响下一刻速度，所以系统有 memory。</div></div></div>
 <p>控制与纯预测的区别就在这里：预测只问“接下来会怎样”，控制还要问“我能施加什么输入，让接下来变成我希望的样子”。反馈把 measurement 接回 controller，使模型误差和 disturbance 不必在一开始被完美预测。</p>
 <div class="cs-misconception"><strong>常见错误直觉</strong>“只要模型足够精确，feedforward 就够了。”问题是未知 disturbance 与参数变化会让模型永远不完全精确；而 feedback 的价值正是用现实 measurement 持续纠偏。</div>`),
 S('1.2','Elements of Control Systems · 一张 block diagram 里每个东西到底是谁',['L01 slides','L01 annotated','B01'],String.raw`
 <p>ETH 的第一讲强调几个角色：<strong>plant</strong> 是被控制的物理过程；<strong>actuator</strong> 把 command 变成力、转矩、流量等物理作用；<strong>sensor</strong> 把现实转换成 measurement；<strong>controller</strong> 根据 reference 和 measurement 计算 command。</p>
 <div class="cs-source-callout"><strong>建议固定用这套读图法</strong><ol><li>先写每条 signal 的名字与单位：$r,e,u,y,d,n$。</li><li>对每个 block 写输入输出关系，例如 $Y=GU$。</li><li>对 summing junction 写代数式，例如 $E=R-Y$。</li><li>最后才消元求 transfer function。</li></ol></div>
 <p>measurement noise $n$ 与 plant disturbance $d$ 要分开。$d$ 真实改变 plant；$n$ 只污染 measurement。两者进入闭环后走的 transfer channel 不同，因此 controller 对它们的处理也不同。</p>
 <p>SISO 表示一个主要输入和一个主要输出；MIMO 则是向量 $u\in\mathbb R^m,y\in\mathbb R^p$。MIMO 不是“多做几套 SISO”这么简单，因为一个 actuator 往往同时影响多个 outputs。</p>`),
 S('1.3','Course Organization · 为什么课程先 frequency domain 再 state space',['L01 slides'],String.raw`
 <p>这门课实际上用两副眼镜观察同一个系统。frequency-domain 路线把 plant 看成 input-output map $G(s)$，特别适合 SISO feedback、Bode、Nyquist、PID、loop shaping；state-space 路线把内部状态写成 $\dot x=Ax+Bu$，特别适合高阶系统、MIMO、state feedback、observer、LQR、Kalman。</p>
 <div class="cs-source-example"><span class="cs-label">同一个二阶系统，两种语言</span><strong>$\ddot y+3\dot y+2y=u$</strong><p>transfer-function 语言：$G(s)=1/(s^2+3s+2)$。state-space 语言：取 $x_1=y,x_2=\dot y$，则 $\dot x=[0\ 1;-2\ -3]x+[0;1]u$。两者描述同一物理 dynamics。</p></div>
 <p>课程的真正逻辑链是：<strong>model → solve/analyze → close the loop → shape performance → move to state space → estimate unmeasured states → optimize → digitize/implement</strong>。因此后面的章节不是互不相干的技巧，而是在同一设计流程中逐步解除假设。</p>`),
 S('1.4','Further Examples · 用不同物理系统训练“抽象能力”',['L01 slides','B01'],String.raw`
 <p>控制理论有价值，是因为同样的数学结构会出现在汽车、无人机、电路、温控、化学过程甚至生物调控中。学习时不要只记住某个 plant 的符号，而要学会找三件事：<strong>state 是什么、input 能改变什么、sensor 看到了什么</strong>。</p>
 <p>例如倒立摆的难点不是“位置 tracking”，而是 open-loop equilibrium 本身 unstable；温控的难点通常是 slow dynamics 与 delay；无人机姿态则是强耦合、多输入多输出、并且状态不能全部直接测量。</p>
 <div class="cs-source-callout"><strong>迁移练习</strong>选一个你熟悉的系统（风扇转速、室温、无人机高度均可），写出 reference、control input、measurement、disturbance、actuator saturation，并说明如果不用 feedback 会出什么问题。</div>`)
 ]};

U['02']={
 note:'PPT 2.1–2.6 + B02 + R01。特别补齐原网页较薄的 Laplace review、causal LTI 定义，以及 PPT 中完整的 discrete-time / z-transform 表示。',
 sections:[
 S('2.1','Modeling of Continuous-Time Dynamical Systems',['L02 slides','L02 annotated','B02','R01'],String.raw`
 <p>一般 continuous-time state-space model 写成 $\dot x=f(t,x,u),\ y=h(t,x,u)$。state 的意义不是“所有物理变量”，而是：<strong>知道当前 state 和未来 input，就足以预测未来</strong>。</p>
 <div class="cs-derivation"><strong>怎样从高阶 ODE 选 state</strong><div class="step"><span>1</span><div>若最高导数是 $y^{(n)}$，通常需要 $n$ 个 states。</div></div><div class="step"><span>2</span><div>最直接取 $x_1=y,x_2=\dot y,\ldots,x_n=y^{(n-1)}$。</div></div><div class="step"><span>3</span><div>前 $n-1$ 行由定义直接得到，最后一行用原 ODE 解出 $y^{(n)}$。</div></div></div>
 <p>对于 LTI 系统，$f,h$ 退化为线性映射：$\dot x=Ax+Bu,\ y=Cx+Du$。$A$ 决定自然 dynamics，$B$ 决定 input 从哪些方向进入，$C$ 决定 sensor 读取哪些组合，$D$ 是 direct feedthrough。</p>
 <p>equilibrium $(x_e,u_e)$ 满足 $0=f(x_e,u_e)$。以后 linearization、tracking around operating point、feedforward equilibrium input 都从这一步开始。</p>`),
 S('2.2','The Laplace Transform · 为什么控制里总把微分变成 s',['L02 slides','R01'],String.raw`
 <p>Laplace transform 的最大价值是把微分方程变成代数方程。对 $\dot y$，有 $\mathcal L\{\dot y\}=sY(s)-y(0)$；若求 transfer function，约定 initial condition 为 0，于是导数只需要乘一个 $s$。</p>
 <div class="cs-derivation"><strong>从 ODE 到 transfer function，不跳步</strong><div class="step"><span>1</span><div>$\ddot y+3\dot y+2y=u$。</div></div><div class="step"><span>2</span><div>zero initial condition 下：$(s^2+3s+2)Y=U$。</div></div><div class="step"><span>3</span><div>定义 $G(s)=Y/U$，所以 $G(s)=1/(s^2+3s+2)$。</div></div></div>
 <div class="cs-misconception"><strong>不要混淆</strong>transfer function 描述的是 zero-initial-condition I/O map。系统有非零初始状态时，输出还会多出 initial-condition response；这部分不能塞进 $G(s)U(s)$。</div>
 <p>Laplace variable $s=\sigma+j\omega$ 同时包含 exponential growth/decay 与 sinusoidal oscillation。把 $s$ 取成 $j\omega$，就得到 frequency response，这会在 L04–L07 成为主角。</p>`),
 S('2.3','System Representations & Conversions',['L02 slides','B02','R01'],String.raw`
 <p>三种常用 representation：differential equation、state space、transfer function。ODE 最靠近建模，state space 保留内部状态，transfer function 只保留 zero-state input-output behavior。</p>
 <div class="cs-derivation"><strong>State space → transfer function</strong><div class="step"><span>1</span><div>$sX=AX+BU$。</div></div><div class="step"><span>2</span><div>$(sI-A)X=BU$。</div></div><div class="step"><span>3</span><div>$X=(sI-A)^{-1}BU$。</div></div><div class="step"><span>4</span><div>$Y=CX+DU=[C(sI-A)^{-1}B+D]U$。</div></div></div>
 <p>所以 $G(s)=C(sI-A)^{-1}B+D$。注意 state-space representation 不唯一：坐标变换 $x=Tz$ 会改变 $A,B,C$，却不改变 external I/O behavior。</p>
 <p>B02 还特别处理了输入导数。若原方程包含 $\dot u$，可以引入 dummy variable / augmented state，使 model 回到标准 state-space 形式；否则直接把 $\dot u$ 当普通 input 会在实现时引入不合理的 differentiator。</p>`),
 S('2.4','Causal Linear Time-Invariant Systems',['L02 slides','B02'],String.raw`
 <p><strong>linear</strong> 表示 superposition；<strong>time invariant</strong> 表示把 input 整体延迟，output 也只会整体延迟；<strong>causal</strong> 表示当前 output 不依赖未来 input。</p>
 <p>对于 rational transfer function，causality 与 properness 紧密相关：若 numerator degree 大于 denominator degree，则实现需要对 input 做理想微分，通常不是 causal/proper 的物理 controller。</p>
 <div class="cs-source-example"><span class="cs-label">快速判断</span><strong>$G(s)=s+1$ 能否当作理想 plant/controller？</strong><p>它包含 differentiator $s$，相对阶数为 -1。数学上可写，但理想高频 gain 无限大，真实系统通常必须加高频 pole，例如 $s/(\tau s+1)$。</p></div>
 <p>LTI 假设把复杂物理压缩成强大的结构：matrix exponential、convolution、transfer function、Bode、superposition 全都依赖它。</p>`),
 S('2.5','Nonlinear Systems & Linearization',['L02 slides','B02','R01'],String.raw`
 <p>真实系统一般是 $\dot x=f(x,u)$。在 equilibrium $(x_e,u_e)$ 附近定义 deviation $\delta x=x-x_e,\delta u=u-u_e$，对 $f$ 做一阶 Taylor expansion：</p>
 <p class="cs-equation">$$\delta\dot x\approx A\delta x+B\delta u,\qquad A=\left.\frac{\partial f}{\partial x}\right|_e,\ B=\left.\frac{\partial f}{\partial u}\right|_e.$$</p>
 <div class="cs-derivation"><strong>为什么常数项消失</strong><div class="step"><span>1</span><div>$f(x,u)\approx f(x_e,u_e)+A\delta x+B\delta u$。</div></div><div class="step"><span>2</span><div>equilibrium 定义就是 $f(x_e,u_e)=0$。</div></div><div class="step"><span>3</span><div>所以只剩线性 deviation dynamics。</div></div></div>
 <p>linearization 是 local model。若 controller 把 state 推得离 operating point 很远，Jacobian model 可能失真，因此“linear controller 能稳定线性化模型”通常只保证 local behavior。</p>`),
 S('2.6','Discrete-Time Systems · modeling, z-transform, representations',['L02 slides','R01'],String.raw`
 <p>PPT 在 L02 已经预告 discrete-time：$x_{k+1}=Ax_k+Bu_k,\ y_k=Cx_k+Du_k$。这里的下标 $k$ 不是连续时间，而是 sample index。</p>
 <p>z-transform 对 sequence $x_k$ 的作用类似 Laplace transform 对 continuous signal。最重要的 shift property 是 $x_{k+1}\leftrightarrow zX(z)$（忽略初值时），于是 difference equation 可以变成 $z$ 的代数式。</p>
 <div class="cs-source-example"><span class="cs-label">Difference equation</span><strong>$y_{k+1}=0.8y_k+u_k$</strong><p>zero initial condition 下，$zY=0.8Y+U$，所以 $G(z)=Y/U=1/(z-0.8)$。pole $0.8$ 在 unit circle 内，因此 mode $0.8^k$ 会衰减。</p></div>
 <p>L12 会把 continuous plant 与 sampler / zero-order hold 正式连接起来；这里先记住：CT 稳定区域是 LHP，DT 稳定区域是 unit disk。</p>`)
 ]};

U['03']={
 note:'PPT 3.1–3.7 + B03 + R02。补齐 matrix exponential 的多种算法、nonlinear local stability、DT stability，以及 PPT appendix 中的 Lyapunov/LaSalle。',
 sections:[
 S('3.1','Review of Linear Algebra · modes 是怎么从 eigenvectors 出来的',['L03 slides','R02','R00'],String.raw`
 <p>对 $Av_i=\lambda_i v_i$，如果 $A$ 有一组完整 eigenvectors，令 $V=[v_1\cdots v_n]$，则 $A=V\Lambda V^{-1}$。坐标 $z=V^{-1}x$ 下，原本耦合的 dynamics 变成 $\dot z_i=\lambda_i z_i$。</p>
 <p>left eigenvector $w_i^TA=\lambda_iw_i^T$ 用来量化初始状态在 mode 上的投影。若 $w_i^Tv_j=\delta_{ij}$，则 $x(t)=\sum_i e^{\lambda_i t}v_iw_i^Tx_0$。</p>
 <div class="cs-misconception"><strong>只看 eigenvalues 不够</strong>eigenvectors 非正交时，即使所有 $\Re\lambda_i<0$，不同 modes 也可能短时间叠加产生很大的 transient；L13 会用这个现象解释 pole placement 的局限。</div>`),
 S('3.2','Solutions of Homogeneous LTI Systems',['L03 slides','B03','R02'],String.raw`
 <p>homogeneous system 是 $\dot x=Ax$。scalar 情况 $\dot x=ax$ 的解为 $e^{at}x_0$；matrix 情况直接推广为</p><p class="cs-equation">$$x(t)=e^{At}x_0.$$</p>
 <p>matrix exponential 的定义 $e^{At}=I+At+(At)^2/2!+\cdots$ 保证 $\frac{d}{dt}e^{At}=Ae^{At}$ 且 $e^{A0}=I$，因此确实满足 ODE 与 initial condition。</p>
 <div class="cs-source-example"><span class="cs-label">Closed-loop preview</span><strong>$\dot x=(A-BK)x$</strong><p>state feedback 之后只需把 $A$ 换成 $A-BK$。因此 controller design 的本质之一，就是塑造 matrix exponential $e^{(A-BK)t}$ 的 modes。</p></div>`),
 S('3.3','Computation of the Matrix Exponential',['L03 slides','B03','R02'],String.raw`
 <p>R02 总结的计算路线不止一种：直接 power series、diagonalization、Jordan form、Cayley–Hamilton、Laplace/resolvent。考试和手算通常优先用 structure，而不是硬展开无穷级数。</p>
 <div class="cs-derivation"><strong>可对角化时</strong><div class="step"><span>1</span><div>$A=V\Lambda V^{-1}$。</div></div><div class="step"><span>2</span><div>$A^k=V\Lambda^kV^{-1}$。</div></div><div class="step"><span>3</span><div>代入 exponential series：$e^{At}=Ve^{\Lambda t}V^{-1}$。</div></div><div class="step"><span>4</span><div>$e^{\Lambda t}$ 只是 diagonal entries $e^{\lambda_i t}$。</div></div></div>
 <p>若不可对角化，Jordan block $J=\lambda I+N$ 给出 $e^{Jt}=e^{\lambda t}(I+Nt+N^2t^2/2!+\cdots)$。这解释了为什么 repeated eigenvalue 在 defective 情况下会带 polynomial factor。</p>`),
 S('3.4','Internal Stability',['L03 slides','B03','R02'],String.raw`
 <p>continuous-time LTI 系统 asymptotically internally stable 当且仅当所有 eigenvalues 满足 $\Re\lambda_i(A)<0$。discrete-time 则要求 $|\lambda_i(A)|<1$。</p>
 <p>“internal” 强调所有 internal states 都衰减，而不只是某个 output 看起来有界。若一个 unstable mode 恰好被 $C$ 看不见，I/O transfer function 可能看似稳定，但内部 state 仍会爆炸。</p>
 <div class="cs-source-example"><span class="cs-label">Feedback example</span><strong>eigenvalues $\{-1,4-k\}$</strong><p>当 feedback gain $k>4$ 时第二个 mode 进入 LHP；$k=4$ 是 marginal boundary；$k<4$ 时存在 growing mode。这是 root locus / pole placement 最简单的预览。</p></div>`),
 S('3.5','Local Stability Analysis of Nonlinear Systems',['L03 slides','R02'],String.raw`
 <p>对 nonlinear system $\dot x=f(x)$，在 equilibrium $x_e$ 处算 Jacobian $A=\partial f/\partial x|_{x_e}$。若 $A$ Hurwitz，则 equilibrium locally asymptotically stable；若存在 RHP eigenvalue，则 locally unstable。</p>
 <p>如果 linearization 出现 purely imaginary / zero-real-part eigenvalue，这个 test inconclusive。此时 nonlinear higher-order terms 可能决定结果，需要 Lyapunov / LaSalle 等工具。</p>
 <div class="cs-misconception"><strong>不要把 local 说成 global</strong>Jacobian 只描述 equilibrium 附近。离得很远时 nonlinear vector field 可以完全不同。</div>`),
 S('3.6','Discrete-Time Systems: Solutions & Stability',['L03 slides','R02'],String.raw`
 <p>DT homogeneous system $x_{k+1}=Ax_k$ 的解非常直接：$x_k=A^kx_0$。含 input 时：</p><p class="cs-equation">$$x_k=A^kx_0+\sum_{i=0}^{k-1}A^{k-1-i}Bu_i.$$</p>
 <p>这与 CT 的 $e^{At}$ + convolution integral 完全平行。DT mode 是 $\lambda^k$，因此 $|\lambda|<1$ 衰减，$|\lambda|>1$ 增长。</p>
 <p>如果 CT system 用 exact ZOH 离散化，$A_d=e^{AT}$，所以 CT pole $s_i$ 映射成 $z_i=e^{s_iT}$：LHP 会被映到 unit disk 内。</p>`),
 S('3.7','Advanced Stability Analysis via Lyapunov Methods',['L03 slides','R02'],String.raw`
 <p>Lyapunov 方法不需要先解出 trajectory。思路像“能量”：找 $V(x)>0$，并证明沿 dynamics $\dot V(x)<0$，就说明 state 一直往低能量方向走。</p>
 <p>对 LTI $\dot x=Ax$，取 $V=x^TPx$，则 $\dot V=x^T(A^TP+PA)x$。若能找到 $P\succ0$ 使</p><p class="cs-equation">$$A^TP+PA=-Q,\qquad Q\succ0,$$</p><p>则 $\dot V=-x^TQx<0$。反过来，对 Hurwitz $A$ 和任意 $Q\succ0$，Lyapunov equation 都有唯一 $P\succ0$。</p>
 <p>DT 对应条件是 $A^TPA-P=-Q$。LaSalle 则放宽到 $\dot V\le0$：只要最大 invariant set 最终只剩 equilibrium，仍可推出 asymptotic convergence。</p>`)
 ]};

U['04']={
 note:'PPT 4.1–4.7 + B04 + R03。这里补上原网页最明显的缺口：frequency-design preview、state-space zeros、TF manipulation、DT/time-discretization。',
 sections:[
 S('4.1','The Convolution Formula',['L04 slides','B04','R03'],String.raw`
 <p>对 causal CT LTI system，zero-state response 是 $y(t)=\int_0^t g(t-\tau)u(\tau)d\tau$。直觉是把 input 切成无数个 infinitesimal impulses；每个 impulse 激发一份 shifted impulse response，再把所有贡献相加。</p>
 <p>state-space 形式从 variation of constants 得到</p><p class="cs-equation">$$x(t)=e^{At}x_0+\int_0^t e^{A(t-\tau)}Bu(\tau)d\tau,$$</p><p>再乘 $C$，可识别 $g(t)=Ce^{At}B+D\delta(t)$。</p>`),
 S('4.2','Input/Output Map, Responses, & Bode Plot',['L04 slides','B04','R03'],String.raw`
 <p>impulse response、transfer function、frequency response 是同一个对象的三种表现：$G(s)=\mathcal L\{g(t)\}$，而 $G(j\omega)$ 就是对 sinusoidal input 的 steady-state gain/phase。</p>
 <p>step response 用来观察 DC gain、rise、overshoot、settling。若 stable 且条件允许，final value theorem 给 $\lim_{t\to\infty}y(t)=\lim_{s\to0}sY(s)$。</p>
 <div class="cs-source-example"><span class="cs-label">Sinusoidal probe</span><strong>$u(t)=\sin\omega t$</strong><p>transient 消失后，output 仍是同频率 sinusoid，只是 amplitude 乘 $|G(j\omega)|$、phase 加 $\angle G(j\omega)$。这就是 Bode plot 能直接指导 controller design 的原因。</p></div>`),
 S('4.3','Preview of Frequency-Domain Control Design',['L04 slides'],String.raw`
 <p>这一节是 L06–L07 的预告：feedback loop 的关键对象不是单独的 $G$ 或 $K$，而是 loop transfer $L=GK$。低频希望 $|L|$ 大以减小 tracking error / disturbance；高频希望 $|L|$ 小以压 measurement noise 和 unmodeled dynamics。</p>
 <p>crossover 附近则必须关心 phase，因为 $L\approx-1$ 是 closed-loop characteristic equation $1+L=0$ 的危险点。于是 magnitude shape 和 phase margin 会同时进入设计。</p>`),
 S('4.4','Poles, Zeros, & BIBO Stability',['L04 slides','B04','R03'],String.raw`
 <p>rational $G(s)=n(s)/d(s)$ 的 poles 是 denominator roots，zeros 是 numerator roots。对 proper rational SISO system，BIBO stability 等价于所有 uncancelled poles 在 LHP。</p>
 <p>zero 不直接造成自然 mode，但会重塑 response。RHP zero 是 non-minimum-phase：它带来额外 phase lag、inverse response，并限制 bandwidth。</p>
 <div class="cs-misconception"><strong>危险的 pole-zero cancellation</strong>若 unstable pole 被 transfer-function zero 精确 cancel，外部 $G(s)$ 可能看不见它，但内部 state 仍可能 unstable。内部稳定性比 BIBO 稳定更强。</div>`),
 S('4.5','Appendix: Zeros in State Space',['L04 slides','R03'],String.raw`
 <p>state-space 系统的 zero 不应只靠“先算 transfer function 再看 numerator”理解。transmission zero $s=z$ 的几何含义是：存在非零 state/input direction $(x,u)$，使</p><p class="cs-equation">$$(zI-A)x-Bu=0,\qquad Cx+Du=0.$$</p>
 <p>也就是系统内部可以沿某个 exponential mode 运动，但 output 被恰好隐藏。用 Rosenbrock system matrix</p><p class="cs-equation">$$\mathcal R(s)=\begin{bmatrix}sI-A&-B\\C&D\end{bmatrix}$$</p><p>判断：当它在某个 $s=z$ 失去 normal rank 时，$z$ 是 transmission zero。</p>
 <p>这个定义对 MIMO 也适用，因此比 SISO numerator zero 更一般。</p>`),
 S('4.6','Appendix: Transfer Function Modeling & Manipulations',['L04 slides','R03'],String.raw`
 <p>常见 block algebra 必须能熟练手算：series $G_1G_2$，parallel $G_1+G_2$，negative feedback $G/(1+GH)$。这些公式都应从 signal equations 消元得到，而不是只背结论。</p>
 <p>factorization 也很重要：把 gain、integrators、first-order poles/zeros、second-order factors 拆开后，Bode magnitude/phase 可以逐项相加。</p>
 <div class="cs-source-callout"><strong>proper / strictly proper</strong>$\deg n\le\deg d$ 是 proper；严格小于则 strictly proper。physical plant 常 strictly proper；controller 可以 proper，但理想 differentiator 不 proper，需用 filtered derivative。</div>`),
 S('4.7','Discrete-Time Systems & Time-Discretization',['L04 slides','R03'],String.raw`
 <p>PPT 在这里再次把 CT 与 DT 联系起来。DT convolution 是 $y_k=\sum_{i=0}^k g_{k-i}u_i$；z-domain transfer function 是 impulse sequence 的 z-transform。</p>
 <p>若 continuous plant 经过 sampler + zero-order hold，不能简单把 $s$ 换成 $z$。exact state-space discretization 是 $A_d=e^{AT}$、$B_d=\int_0^T e^{A\tau}B\,d\tau$；L12 会完整推导。</p>
 <p>这一提前量很重要：digital controller 设计中，“离散化 controller”与“离散化 plant”是两个不同问题。</p>`)
 ]};

U['05']={
 note:'PPT 5.1–5.6 + B05 + R04。补上 feedback case study、black-box PID tuning appendix 和 desirable pole locations。',
 sections:[
 S('5.1','Case Study: Benefits of Feedback',['L05 slides','L05 annotated','B05'],String.raw`
 <p>feedback 的三个主要收益：reject disturbance、降低 model uncertainty sensitivity、stabilize unstable dynamics。代价则是可能引入 instability、noise amplification 和 actuator effort。</p>
 <p>若 plant gain 从 $G$ 变成 $G+\Delta G$，closed-loop map $T=GK/(1+GK)$ 对小相对模型误差的敏感度会被 $S=1/(1+GK)$ 缩小。这是“robustness from feedback”的定量版本。</p>`),
 S('5.2','Feedback Stability',['L05 slides','B05','R04'],String.raw`
 <p>unity negative feedback 的 closed-loop transfer 是 $T=GK/(1+GK)$。稳定性真正由 characteristic equation $1+GK=0$ 决定，而不是只看 $G$ 或 $K$ 各自是否稳定。</p>
 <div class="cs-derivation"><strong>为什么 feedback 会改变 poles</strong><div class="step"><span>1</span><div>$E=R-Y$，$U=KE$，$Y=GU$。</div></div><div class="step"><span>2</span><div>$Y=GK(R-Y)$。</div></div><div class="step"><span>3</span><div>$(1+GK)Y=GKR$。</div></div><div class="step"><span>4</span><div>denominator 出现 $1+GK$，所以 closed-loop poles 是它的 zeros。</div></div></div>`),
 S('5.3','Poles, Zeros, & the Root-Locus Plot',['L05 slides','B05','R04'],String.raw`
 <p>对 $L(s)=kz(s)/p(s)$，closed-loop characteristic polynomial 是 $p(s)+kz(s)$。root locus 就是当 $k$ 从 0 变化到 $\infty$ 时，这个 polynomial 的 roots 在 complex plane 上如何移动。</p>
 <p>基本规则：branches 从 open-loop poles 出发，终止于 open-loop zeros 或 infinity；real-axis segment 可用右侧 pole/zero 奇偶数判断；若 poles 多于 zeros，剩余 branches 沿 asymptotes 去 infinity，centroid 由 poles/zeros 和决定。</p>
 <p>root locus 不只是画图题，它直接回答“gain 增大会让 damping 变好还是变坏、会不会跨入 RHP”。</p>`),
 S('5.4','PID Control',['L05 slides','B05','R04'],String.raw`
 <p>$K(s)=k_P+k_I/s+k_Ds$。P 处理当前 error；I 累积历史 error，增加 system type、改善 constant reference/disturbance steady-state error；D 对 error trend 作反应，提供 phase lead / damping。</p>
 <p>理想 D 的高频 gain 无限大，所以现实实现写成 $k_D\frac{s}{\tau_D s+1}$。derivative 通常对 measurement 做而不是对 reference 做，以减少 reference step 引起的 derivative kick。</p>
 <div class="cs-misconception"><strong>PID 不是“三个旋钮都往大调”</strong>I 会降低 phase margin 并可能 wind up；D 会放大 noise；P 太大会把 crossover 推进 delay/unmodeled dynamics 区域。</div>`),
 S('5.5','Appendix: PID Black-Box Tuning Heuristics',['L05 slides','R04'],String.raw`
 <p>PPT 把一些 black-box tuning rule 放在 appendix。它们的定位是“没有好模型时给初值”，不是理论最优保证。经典思路包括寻找 ultimate gain / oscillation period，再按经验比例给 P/PI/PID 参数。</p>
 <p>真正使用时必须再检查：closed-loop stability、overshoot、noise、saturation、robustness margins。尤其现代系统若有 delay、non-minimum-phase zero 或强 actuator limit，直接套经验表可能非常激进。</p>
 <div class="cs-source-callout"><strong>学习标准</strong>考试时应理解这些 heuristic 的目的与局限；工程上更推荐用 model-based loop shaping 或 optimization 做二次校正。</div>`),
 S('5.6','Pole Placement & Desirable Pole Locations',['L05 slides','B05'],String.raw`
 <p>二阶 dominant poles 常写成 $s=-\zeta\omega_n\pm j\omega_n\sqrt{1-\zeta^2}$。$\omega_n$ 控制总体时间尺度，$\zeta$ 控制 oscillation/damping。</p>
 <p>常用近似：$M_p\approx e^{-\pi\zeta/\sqrt{1-\zeta^2}}$，2% settling time $t_s\approx4/(\zeta\omega_n)$。因此 time-domain spec 可以转成 complex-plane 中允许的 pole region。</p>
 <p>这套思路会在 L10 state feedback 中再次出现；区别只是那里用矩阵 $K$ 同时安排多个 poles。</p>`)
 ]};

U['06']={
 note:'PPT 6.1–6.5 + B06 + R05。把 argument principle 的正式逻辑、standard Nyquist、generalized contour、small-gain/Bode criterion 和闭环 shape 全部拆开。',
 sections:[
 S('6.1','Review: the Argument Principle',['L06 slides','L06 annotated','B06','R05'],String.raw`
 <p>argument principle 把一个难题“区域内部有多少 zeros/poles”转换成边界曲线“绕原点几圈”。若 rational $F(s)$ 在 clockwise contour $D$ 内有 $Z$ 个 zeros、$P$ 个 poles，则 image $F(D)$ 对原点的净 clockwise encirclement 为 $N=Z-P$。</p>
 <div class="cs-derivation"><strong>直觉推导：phase 为什么会累计 2π</strong><div class="step"><span>1</span><div>写 $F(s)=\prod_i(s-z_i)/\prod_j(s-p_j)$。</div></div><div class="step"><span>2</span><div>$\angle F=\sum_i\angle(s-z_i)-\sum_j\angle(s-p_j)$。</div></div><div class="step"><span>3</span><div>当 contour 绕过一个内部 zero 一整圈，向量 $s-z_i$ 的 phase 净变化一整圈；内部 pole 贡献符号相反。</div></div><div class="step"><span>4</span><div>外部 pole/zero 的向量不会完成一整圈，因此净 phase change 为 0。</div></div></div>
 <p>Nyquist criterion 只是把这里的 $F$ 特别选成 closed-loop characteristic function。</p>`),
 S('6.2','Nyquist Criterion 1: Argument Principle Applied to Characteristic Polynomial',['L06 slides','B06','R05'],String.raw`
 <p>定义 $F(s)=1+kL(s)$。$F$ 的 zeros 正是 closed-loop poles，因为 $1+kL=0$ 就是 characteristic equation。$F$ 的 poles 与 open-loop $L$ 的 poles 相同。</p>
 <p>选择包围 RHP 的 Nyquist contour，令 $P$ 为 open-loop RHP poles 数、$Z$ 为 closed-loop RHP poles 数。argument principle 给 $Z=N+P$（按课程 clockwise convention）。闭环稳定要求 $Z=0$。</p>
 <p>把 $F=1+kL$ 的 image 向左平移 1，就得到 standard Nyquist plot $kL(D)$，于是“绕原点”变成“绕 $-1$”。</p>
 <div class="cs-misconception"><strong>open-loop unstable 时不是“不能用 Nyquist”</strong>恰恰相反：如果 $P>0$，Nyquist plot 必须产生正确数量和方向的 $-1$ encirclement，才能让 $Z=0$。</div>`),
 S('6.3','Nyquist Criterion 2: Standard Form, Robustness Margins, & Small Gain',['L06 slides','L06 annotated','R05'],String.raw`
 <p>standard Nyquist plot 是 $L(j\omega)$ 连同完整 Nyquist contour 的 image。实系数系统关于 real axis 对称；strictly proper $L$ 的 infinite-radius arc 通常映到 origin。</p>
 <p>gain margin 看在 phase 达到 $-180^\circ$ 时还能把 magnitude 放大多少才碰 $-1$；phase margin 看在 magnitude 为 1 时还差多少 phase 才到 $-180^\circ$。pure delay $e^{-sT}$ 不改 magnitude，只增加 $-\omega T$ phase，因此 phase margin 直接对应 delay tolerance。</p>
 <p>small-gain criterion 给出更保守但简单的稳定条件：若 open-loop stable 且 $\|L\|_\infty<1$，Nyquist curve 完全在 unit disk 内，不可能碰/围住 $-1$。</p>
 <p>PPT 还强调 generalized D-contour：若 imaginary axis 上有 poles/zeros，需要绕开它们；具体 contour 变了，计数 $P,N,Z$ 的 bookkeeping 也要一致地变。</p>`),
 S('6.4','Nyquist Criterion 3: Control Design Form & Bode Criterion',['L06 slides','B06','R05'],String.raw`
 <p>工程设计通常不想每次画完整 Nyquist contour，于是对满足额外条件的 open-loop system，用 Bode crossover 来做等价/充分判断。核心仍是：unity-gain crossing 时 phase 不应太接近 $-180^\circ$。</p>
 <p>因此 controller design 会主动塑造 $L=GK$：把 cross-over 放在模型可信的 frequency range，让 slope 不太陡，并保留足够 phase margin。L07 的 lead/lag/PI 就是在做这件事。</p>
 <div class="cs-source-callout"><strong>Bode criterion 不是无条件替代 Nyquist</strong>若 open-loop 有 RHP poles、复杂多次 crossing，或条件不满足，应回到 general Nyquist counting。</div>`),
 S('6.5','Control Specifications & Desirable Closed-Loop Shapes',['L06 slides','B06','R05'],String.raw`
 <p>定义 sensitivity $S=1/(1+L)$ 与 complementary sensitivity $T=L/(1+L)$，并有 $S+T=1$。reference tracking 多由 $T$ 决定，input/output disturbance 常乘 $S$，measurement noise 常通过 $T$ 传到 output。</p>
 <p>因此低频希望 $|S|\ll1$（tracking/扰动好），高频希望 $|T|\ll1$（noise/unmodeled dynamics 好）。但 $S+T=1$ 表明你不能在同一个 frequency 同时让两者都任意小。</p>
 <p>bandwidth 是这个 trade-off 的中心：更高 bandwidth 通常更快、低频误差更小，但 noise、delay sensitivity、actuator demand 都会上升。robust design 的目标不是“gain 越大越好”，而是把高 gain 放在值得的频段。</p>`)
 ]};

U['07']={
 note:'PPT 7.1–7.5 + B07 + R06。把 desirable shapes、完整 loop-shaping workflow、IMC 以及二阶 tuning appendix 逐项补齐。',
 sections:[
 S('7.1','Review: Desirable Closed-Loop Shapes',['L07 slides','B07','R06'],String.raw`
 <p>closed-loop design 先从 $S,T$ 目标出发，而不是一上来选 PI/lead。低频 tracking/disturbance rejection 要求 $T\approx1,S\approx0$；高频 noise attenuation 要求 $T\approx0,S\approx1$。</p>
 <p>time-domain spec 也能转成 frequency-domain intuition：更快 rise time 通常意味着更高 bandwidth；overshoot 与 phase margin / damping 有关。</p>`),
 S('7.2','Desirable Open-Loop Shapes',['L07 slides','B07','R06'],String.raw`
 <p>因为 $S=1/(1+L)$、$T=L/(1+L)$，理想 open-loop shape 大致是：低频 $|L|\gg1$，高频 $|L|\ll1$，在 crossover 附近留足 phase。</p>
 <p>常见目标是 crossover 周围约 $-20$ dB/dec slope。过陡 slope 往往伴随更大 phase lag，robustness 变差；过平则可能造成宽广高 gain 和 noise/control-effort 问题。</p>`),
 S('7.3','(Open) Loop Shaping',['L07 slides','L07 annotated','B07','R06'],String.raw`
 <p>loop shaping 是“看缺什么就加什么”。P 改整体 gain；PI 在低频增加 integrator action；lag 提升低频相对 gain；lead 在 crossover 附近提供 positive phase；low-pass 让 high-frequency roll-off 更快。</p>
 <div class="cs-derivation"><strong>典型 lead design workflow</strong><div class="step"><span>1</span><div>从 plant Bode 读当前 crossover 和 phase margin。</div></div><div class="step"><span>2</span><div>选目标 crossover $\omega_c$ 与目标 PM，算缺多少 phase。</div></div><div class="step"><span>3</span><div>选 lead $K_{lead}=k(1+s/z)/(1+s/p)$，满足 $z<p$。</div></div><div class="step"><span>4</span><div>把最大 phase boost 放在 $\omega_c$ 附近。</div></div><div class="step"><span>5</span><div>最后用 gain $k$ 调到 $|L(j\omega_c)|=1$，再复查 S/T、noise 和 actuator。</div></div></div>
 <p>不要只看 compensator 单独 Bode；最终验证对象必须是 shaped loop $L=GK$ 和 closed loop。</p>`),
 S('7.4','Closed Loop Shaping: Internal Model Control',['L07 slides','B07','R06'],String.raw`
 <p>IMC 从“如果模型完全准确，能不能直接指定 desired closed-loop map”出发。模型 $\hat G$ 与 filter/inverse $Q$ 组合后，在 perfect-model 情况常有 $T=GQ$、$S=1-GQ$。</p>
 <p>把 IMC 结构改写成普通 feedback，可得到 $K=Q/(1-\hat GQ)$。这说明 IMC 不是另一套神秘理论，而是 controller parameterization。</p>
 <p>关键限制都来自 inverse：RHP zero 不能稳定 inverse，delay 的 inverse 是 time advance 不 causal，strictly proper plant 的 inverse 不 proper。因此现实 $Q$ 通常只逆 minimum-phase 可逆部分，再乘 low-pass filter。</p>`),
 S('7.5','Appendix: Tuning Criteria for 2nd-Order Systems',['L07 slides','R06'],String.raw`
 <p>标准二阶 denominator $s^2+2\zeta\omega_ns+\omega_n^2$ 把 transient spec 连接到 pole geometry。$\zeta$ 决定 overshoot/oscillation，$\omega_n$ 决定速度。</p>
 <p>常用关系：$M_p=e^{-\pi\zeta/\sqrt{1-\zeta^2}}$；$t_s\approx4/(\zeta\omega_n)$；damped frequency $\omega_d=\omega_n\sqrt{1-\zeta^2}$。这些不是精确适用于所有高阶系统的公式，而是 dominant-second-order approximation。</p>
 <div class="cs-source-example"><span class="cs-label">把 spec 反推 pole</span><strong>若要求 $M_p<10\%$、$t_s<2$s</strong><p>先由 overshoot 解出最小 $\zeta$，再由 settling time 得到最小 $\zeta\omega_n$，于是 pole 必须落在同时满足 damping ratio wedge 与 vertical decay boundary 的区域内。</p></div>`)
 ]};

window.sourceComplete=root;
window.sourceCompleteAReady=true;
})();