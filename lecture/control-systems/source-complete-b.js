(function(){
const root=window.sourceComplete||{units:{}};
const U=root.units;
const S=(ppt,title,sources,html)=>({ppt,title,sources,html});

U['08']={
 note:'PPT 8.1–8.8 + B08 + R07。原网页已经有主要 architecture，这里按 PPT 把 perfect-control teaser、static nonlinearities、delay compensation 和 multivariable architectures 补完整。',
 sections:[
 S('8.1','Teaser: Perfect Control',['L08 slides','L08 annotated','B08','R07'],String.raw`
 <p>“perfect control” 的诱惑是直接取 $K=G^{-1}$，让 $GK=1$。但这马上暴露三类现实限制：<strong>inverse 可能不稳定/不因果/不 proper，模型不可能完全精确，actuator 也有幅值和速率限制</strong>。</p>
 <p>若 $G$ 有 RHP zero，$G^{-1}$ 会有 unstable pole；若 $G$ 有 delay $e^{-sT}$，inverse 需要 $e^{+sT}$，等于提前知道未来；若 $G$ strictly proper，inverse 往往是 differentiator-like、high-frequency gain 巨大。</p>
 <div class="cs-source-callout"><strong>这一讲的主线</strong>不是追求“更聪明的单 loop controller”，而是承认系统结构，把可以前馈的、可以内环处理的、必须防 windup 的、必须补偿 delay 的问题拆开。</div>`),
 S('8.2','Disturbance Decoupling',['L08 slides','B08','R07'],String.raw`
 <p>若 disturbance $w$ 可测并通过 $G_w$ 进入 output，而 control input 经 $G$ 进入，则加 feedforward $K_f$ 后 disturbance channel 为 $GK_f+G_w$。令它为 0：</p><p class="cs-equation">$$K_f=-G_wG^{-1}.$$</p>
 <p>这是真正的“在 disturbance 造成 error 前动作”。它比 feedback 快，但依赖 disturbance sensor 和模型。若 $G^{-1}$ 不可实现，就只能做 stable/causal approximate inverse。</p>
 <div class="cs-misconception"><strong>可测 ≠ 可完美消除</strong>measurement delay、sensor noise、RHP zero、actuator saturation 都会破坏 exact cancellation。</div>`),
 S('8.3','Two-Degree-of-Freedom Control',['L08 slides','B08','R07'],String.raw`
 <p>2-DOF 把 reference shaping 和 robustness 分开：$u=K_{ff}r+K_{fb}(r-y)$。feedback $K_{fb}$ 负责稳定、扰动、uncertainty；feedforward $K_{ff}$ 负责 nominal tracking。</p>
 <p>如果只用一个 feedback controller，你往往被迫用同一组 dynamics 同时兼顾 reference 和 disturbance。2-DOF 允许 reference response 比 disturbance rejection 更平滑，或者反过来。</p>
 <div class="cs-source-example"><span class="cs-label">Mechanical tracking</span><strong>$G(s)=1/(s^2+3s)$</strong><p>若 reference 足够平滑，nominal feedforward 可以直接提供 $u_{ff}=\ddot r+3\dot r$；feedback 只需把 residual error 拉回去。</p></div>`),
 S('8.4','Cascaded Control',['L08 slides','B08','R07'],String.raw`
 <p>cascade controller 有 fast inner loop 和 slow outer loop。inner loop 通常控制更靠近 actuator 的变量，能在 disturbance 传播到最终 output 前就看到并纠正它。</p>
 <p>设计顺序必须从内到外：先把 inner loop 闭合并验证稳定与 bandwidth，再把它当作新的 effective plant 给 outer loop。经验上 inner bandwidth 应显著高于 outer bandwidth，才能形成 time-scale separation。</p>
 <div class="cs-misconception"><strong>两个 loop 都“很快”不代表更好</strong>若 bandwidth 接近，outer controller 看到的不再是近似静态/简单的 inner closed loop，两个 loop 的 phase lag 会叠加，可能反而失稳。</div>`),
 S('8.5','Anti-Windup',['L08 slides','B08','R07'],String.raw`
 <p>PI/PID 的 integrator 假设 commanded input 可以真正施加。但 actuator saturation 时 $u\ne u_c$，error 仍持续积分，integrator state 会积到很大，这就是 windup。</p>
 <p>back-calculation 的典型形式：</p><p class="cs-equation">$$\dot x_I=e+K_a(u-u_c).$$</p>
 <p>未饱和时 $u=u_c$，额外反馈为 0；饱和时 $u-u_c$ 把 integrator 往可实现区域拉回来。另一类做法是 conditional integration：饱和且 error 继续把 actuator 推向同一方向时暂时冻结积分。</p>`),
 S('8.6','Static Block Nonlinearities',['L08 slides','L08 annotated'],String.raw`
 <p>这一 PPT 子章是当前网站之前几乎没展开的内容。常见 static nonlinearities 包括 saturation、dead zone、relay、hysteresis。它们没有自己的动态 state，但会让“输入输出关系不再线性”。</p>
 <p><strong>saturation</strong> 限制最大控制量；<strong>dead zone</strong> 表示小 command 根本不起作用，例如机械间隙；<strong>relay</strong> 只输出几个离散值；<strong>hysteresis</strong> 让 output 还依赖输入变化方向。</p>
 <p>一旦进入这些区域，superposition 失效，单纯的 linear transfer function 无法精确描述。工程上需要 simulation、sector intuition、anti-windup 或专门 nonlinear analysis。</p>
 <div class="cs-source-example"><span class="cs-label">为什么 saturation 会改变 pole intuition</span><p>线性设计得到 $u=-Kx$，但实际 $u=\operatorname{sat}(-Kx)$。state 很大时 controller gain effectively 变小，因此你在线性模型里安排的 closed-loop poles 不再代表真实 transient。</p></div>`),
 S('8.7','Delay Compensation',['L08 slides','B08','R07'],String.raw`
 <p>pure delay $e^{-\lambda s}$ 不改变 magnitude，却额外增加 $-\omega\lambda$ phase。frequency 越高，phase penalty 越大，所以 delay 是 bandwidth 的硬约束之一。</p>
 <p>Smith predictor 用 nominal model 把 delay-free prediction 放到 feedback design loop 中。理想 model 下，controller 可以按 delay-free $G$ 设计，最终 output 仍带物理 delay：</p><p class="cs-equation">$$T(s)=\frac{K(s)G(s)}{1+K(s)G(s)}e^{-\lambda s}.$$</p>
 <p>重要的是：Smith predictor 没有“消灭时间延迟”。它只是让 controller 不必把 delay 的 phase 全部留在内部设计环里；model/delay mismatch 仍会影响 robustness。</p>`),
 S('8.8','Multivariable Control Architectures',['L08 slides','L08 annotated','R08'],String.raw`
 <p>MIMO 情况 $y=G(s)u$，每个 actuator 可能影响多个 outputs。第一步常是 pairing：哪个 input 主要管哪个 output。Relative Gain Array</p><p class="cs-equation">$$\Lambda=G\odot G^{-T}$$</p><p>用“其他 loops open vs closed”后的相对 gain 衡量 interaction。接近 1 的 pairing 往往更自然，large negative entries 通常意味着危险 interaction。</p>
 <p>若 coupling 可逆，可以设计 decoupling precompensator $H$ 使 $GH$ 近似 diagonal，再做多个 SISO loops。但 exact inverse 同样受到 RHP zero、delay、properness、uncertainty 限制。</p>
 <p>因此 multivariable architecture 的核心不是“把 off-diagonal 消成 0”，而是在可实现性和 robustness 之间决定：完全 decouple、部分 decouple，还是直接用 state-space MIMO control。</p>`)
 ]};

U['09']={
 note:'PPT 9.1–9.4 + B09 + R08。把 controllability 的四个 PPT 子章按原顺序补齐，并把 Gramian / modal test / state-feedback connection 讲完整。',
 sections:[
 S('9.1','Controllability & Reachability',['L09 slides','B09','R08'],String.raw`
 <p>reachable：从 $x(0)=0$ 出发，能否用 input 在有限时间到达任意 $x_T$；controllable：能否把任意初始状态驱到 0。CT LTI 因 $e^{AT}$ 总可逆，两者等价；DT 若 $A$ singular，概念要更谨慎地区分。</p>
 <p>controllability matrix</p><p class="cs-equation">$$\mathcal C=[B\ AB\ A^2B\ \cdots\ A^{n-1}B]$$</p><p>full row rank $n$ 当且仅当系统 controllable。每一组 columns 可以理解为 actuator direction 被 dynamics $A$ 传播后的新方向。</p>
 <div class="cs-source-example"><span class="cs-label">Double integrator</span><p>$A=[0\ 1;0\ 0],B=[0;1]$，虽然只有一个 actuator，但 $B=[0;1]$ 与 $AB=[1;0]$ 恰好 span 两个 state directions，因此 controllable。</p></div>`),
 S('9.2','Controllability Gramian & Minimum Energy Control',['L09 slides','B09','R08'],String.raw`
 <p>finite-horizon controllability Gramian</p><p class="cs-equation">$$W_c(T)=\int_0^T e^{A\tau}BB^Te^{A^T\tau}\,d\tau$$</p><p>把“能不能到达”升级成“到达某方向有多费力”。$W_c(T)$ nonsingular 等价于 reachability；其小 eigenvalue 对应难以激发的 state direction。</p>
 <p>从 $0$ 驱到 target $v$ 的 minimum-energy input 为</p><p class="cs-equation">$$u^*(t)=B^Te^{A^T(T-t)}W_c(T)^{-1}v,$$</p><p>最小能量是 $v^TW_c^{-1}v$。这让 controllability 不再只是 yes/no rank test。</p>`),
 S('9.3','Modal Controllability',['L09 slides','B09','R08'],String.raw`
 <p>PBH test 从 mode 角度问问题：对每个 $\lambda\in\sigma(A)$，若 $\operatorname{rank}[\lambda I-A\ \ B]=n$，该 mode controllable。left eigenvector 形式更直观：若 $w^TA=\lambda w^T$ 且 $w^TB=0$，actuator 对这个 mode 完全没有投影。</p>
 <p>这解释了 stabilizability：不要求所有 modes 都 controllable，只要求所有 unstable modes 可控；不可控但已经 stable 的 mode 可以留在那里。</p>
 <div class="cs-misconception"><strong>rank(C) 不是“数 actuator”</strong>一个 actuator 经 dynamics 传播后可以影响多个 state directions；反过来，多个 actuators 也可能都沿同一个方向作用而仍不 controllable。</div>`),
 S('9.4','The Concept of State Feedback Control',['L09 slides','B09'],String.raw`
 <p>一旦知道哪些 modes 可控，就自然进入 $u=-Kx$。代回 plant：</p><p class="cs-equation">$$\dot x=(A-BK)x.$$</p>
 <p>所以 state feedback 直接修改 system matrix。若 $(A,B)$ controllable，可通过选择 $K$ 把 closed-loop poles 放到任意期望位置；若只 stabilizable，则至少可以把所有 unstable controllable modes 推入 stable region。</p>
 <p>L09 在这里主要建立概念，L10 才正式给出 controllable canonical form、pole-placement algorithm、tracking prefilter 和 integral augmentation。</p>`)
 ]};

U['10']={
 note:'PPT 10.1–10.4 + B10 + R09。补齐 state feedback 从概念到 CCF、pole placement，再到 prefilter/integrator augmented loops 的完整链。',
 sections:[
 S('10.1','The Concept of State Feedback Control',['L10 slides','B10','R09'],String.raw`
 <p>frequency-domain controller 根据 error/filter dynamics 生成 input；state feedback 则直接把每个 state 按权重组合：$u=-Kx$。对于 $n$ states、$m$ inputs，$K\in\mathbb R^{m\times n}$。</p>
 <p>设计目标不是让 $K$ 数字“看起来合理”，而是让 $A-BK$ 的 spectrum 和 transient behavior 满足要求，同时控制 actuator effort。</p>`),
 S('10.2','Controllable Canonical Form',['L10 slides','B10','R09'],String.raw`
 <p>CCF 把 controllable SISO system 变成一个最容易做 coefficient matching 的坐标。典型 companion matrix 最后一行包含 characteristic polynomial coefficients，而 $B$ 只在最后一个 state 进入。</p>
 <p>若 $x=Tz$，则 $A_c=T^{-1}AT,B_c=T^{-1}B$。controllability 保证存在这样的 nonsingular $T$。在 CCF 中，feedback gain $K_c$ 直接修改 characteristic polynomial coefficients。</p>
 <div class="cs-source-callout"><strong>为什么要换坐标</strong>不是为了改变 system，而是为了把 pole placement 从矩阵问题变成 polynomial coefficient matching；算完 $K_c$ 后再变回原坐标。</div>`),
 S('10.3','State Feedback Control',['L10 slides','B10','R09'],String.raw`
 <p>pole placement 要求 desired polynomial $p_d(s)=\prod_i(s-p_i)$。在 CCF 中可直接比较 $A-BK$ 的 characteristic coefficients；一般坐标可用 Ackermann formula 或数值 `place` algorithm。</p>
 <p>时间域 spec 常先转换为 pole region：settling time 约限制 real part，overshoot 约限制 damping ratio，actuator/sensor bandwidth 限制 poles 不能无限向左。</p>
 <div class="cs-misconception"><strong>“pole 越左越好”是错的</strong>fast poles 要求更大 gain/control effort，也会放大 noise、model uncertainty，并可能激发未建模 fast dynamics。</div>
 <p>实际软件优先用 robust numerical pole-placement routines，而不是手写 Ackermann 处理高阶系统，因为 controllability matrix 可能 condition number 很差。</p>`),
 S('10.4','Augmented State Feedback Loops',['L10 slides','B10','R09'],String.raw`
 <p>单纯 $u=-Kx$ 是 regulator：把 state 拉向 0。若要 tracking 非零 constant reference，可加 static prefilter。求 equilibrium maps $N_x,N_u$：</p><p class="cs-equation">$$\begin{bmatrix}A&B\\C&D\end{bmatrix}\begin{bmatrix}N_x\\N_u\end{bmatrix}=\begin{bmatrix}0\\I\end{bmatrix},\qquad u=-Kx+(N_u+KN_x)r.$$</p>
 <p>但 prefilter 依赖 model，不能自动消除 constant model mismatch/disturbance。于是可加 integral state $\dot x_I=r-y$，把它和 original state 一起做 augmented feedback。</p>
 <p>augmented system 必须再次检查 controllability/stabilizability。integral action 不是“免费加一个积分器”，它增加 state dimension，也会引入 windup 风险。</p>`)
 ]};

U['11']={
 note:'PPT 11.1–11.6 + B11 + R10。补齐 observability duality、geometric zeros、separation/frequency-domain view，以及 observer 与 augmented loops 的衔接。',
 sections:[
 S('11.1','Preview of State Estimation',['L11 slides','B11'],String.raw`
 <p>state feedback 假设 $x$ 全部已知，但现实 sensor 常只给 $y=Cx$。observer 的思路是同时运行一份 model，预测 state；measurement 到来后，用 prediction error 修正预测。</p>
 <p>open-loop predictor $\dot{\hat x}=A\hat x+Bu$ 的问题是 model/initial-condition error 不会自动纠正。加入 innovation feedback：</p><p class="cs-equation">$$\dot{\hat x}=A\hat x+Bu+L(y-C\hat x).$$</p>
 <p>这就是 Luenberger observer，也是后面 Kalman filter 的 deterministic 骨架。</p>`),
 S('11.2','State-Space Observability & Duality',['L11 slides','B11','R10'],String.raw`
 <p>observability 问：从已知 input 与 output history，能否唯一重建 initial state。observability matrix</p><p class="cs-equation">$$\mathcal O=\begin{bmatrix}C\\CA\\\vdots\\CA^{n-1}\end{bmatrix}$$</p><p>full column rank $n$ 当且仅当 observable。</p>
 <p>duality：$(A,B)$ controllability 对应 $(A^T,C^T)$ observability。因此 controllability matrix、PBH、Gramian、canonical form 的很多定理可以直接转置得到 observer 版本。</p>
 <p>detectability 是弱化条件：所有 unobservable modes 必须 stable。它足以让 observer estimation error 收敛。</p>`),
 S('11.3','Observer Design',['L11 slides','B11','R10'],String.raw`
 <div class="cs-derivation"><strong>error dynamics 不跳步</strong><div class="step"><span>1</span><div>plant：$\dot x=Ax+Bu$。</div></div><div class="step"><span>2</span><div>observer：$\dot{\hat x}=A\hat x+Bu+L(y-C\hat x)$。</div></div><div class="step"><span>3</span><div>定义 $e=x-\hat x$，且 $y=Cx$。</div></div><div class="step"><span>4</span><div>相减得到 $\dot e=(A-LC)e$。</div></div></div>
 <p>因此 observer gain $L$ 的设计与 state-feedback gain $K$ 完全对偶：若 $(C,A)$ observable，可以安排 $A-LC$ 的 poles。</p>
 <p>observer poles 通常比 controller poles 快，但不能无限快；大的 $L$ 会把 measurement noise 强烈注入 estimate。</p>`),
 S('11.4','Zeros & Geometric Perspective',['L11 slides','R10'],String.raw`
 <p>这一章把 observability 与 transfer-function zeros 联系起来。一个 state direction 若无法通过 output 看见，就可能形成 unobservable internal mode；pole-zero cancellation 也可以解释为某些内部 directions 不出现在 I/O map 中。</p>
 <p>Kalman decomposition 把 state space 分成 controllable/observable、controllable/unobservable、uncontrollable/observable、uncontrollable/unobservable 四类子空间。transfer function 的 minimal realization 只保留 controllable + observable 部分。</p>
 <div class="cs-source-callout"><strong>为什么这很重要</strong>你可以得到一个低阶 transfer function，但实际 realization 里藏着 unstable unobservable/uncontrollable mode；因此 external BIBO behavior 不足以保证 internal stability。</div>`),
 S('11.5','Output Feedback, Separation Principle, & Frequency Domain',['L11 slides','B11','R10'],String.raw`
 <p>用 estimate 代替真实 state：$u=-K\hat x$。把 plant state 和 estimation error 作为 augmented state，可以把 closed-loop matrix 变换成 block triangular，diagonal blocks 分别是 $A-BK$ 和 $A-LC$。</p>
 <p>所以 closed-loop poles 是 controller poles 与 observer poles 的并集，这就是 separation principle：在 stabilizable + detectable 条件下，$K$ 与 $L$ 可以分别设计。</p>
 <p>但 separation 只是 stability/eigenvalue 结构，不代表 robustness 也能完全分开。observer dynamics 会进入最终 dynamic compensator $K(s)$ 的 frequency response，并影响 noise/control effort。</p>`),
 S('11.6','Augmented Feedback Loops with State Estimation',['L11 slides','L11 annotated','B11'],String.raw`
 <p>现实 controller 往往同时有 observer、reference prefilter/integrator、disturbance model。设计时应把 controller state 也当成动态系统的一部分，而不是“几块独立模块拼起来就完事”。</p>
 <p>例如 observer-based integral control 可以使用 augmented plant state $[x^T,x_I]^T$，observer 估计不可测 plant states，而 integral state $x_I$ 由 reference/output 直接更新。最终实现是一个 dynamic output-feedback controller。</p>
 <p>检查清单：augmented system stabilizable 吗？observer detectable 吗？integrator 是否会 wind up？observer bandwidth 是否把 sensor noise 放大到 actuator？这些问题比单独看 pole list 更重要。</p>`)
 ]};

U['12']={
 note:'PPT 12.1–12.7 + B12 + R11。补齐 PPT 中两段 sampled-data、z-transform review、emulation、DT LTI review 与 direct discrete design。',
 sections:[
 S('12.1','Motivation · Digital implementation changes the problem',['L12 slides','L12 annotated','B12','R11'],String.raw`
 <p>digital controller 的真实链路是 continuous plant → A/D sampler → discrete algorithm → D/A + hold → actuator。controller 只在 $t=kT$ 看到 measurement，中间发生的 signal detail 已经丢失。</p>
 <p>因此 digital control 不是“把连续公式放进电脑”。sampling 会引入 aliasing；zero-order hold 引入额外 phase/dynamics；computation delay 也占用 phase margin。</p>`),
 S('12.2','Sampled-Data Systems I · Sampling and aliasing',['L12 slides','B12','R11'],String.raw`
 <p>sampling frequency $\omega_s=2\pi/T$，Nyquist angular frequency $\omega_N=\pi/T$。超过 $\omega_N$ 的 continuous frequency 会和低频 samples 产生相同序列，这就是 aliasing。</p>
 <p>anti-alias filter 必须在 ADC 前，因为一旦高频被采样成错误低频，digital algorithm 已无法知道它原来是谁。</p>
 <div class="cs-source-example"><span class="cs-label">Alias</span><p>若 sampling 为 100 Hz，90 Hz sinusoid 在 sample points 上与 -10 Hz / 10 Hz pattern 等价。光看 discrete samples 无法恢复原 90 Hz。</p></div>`),
 S('12.3','Review: Discrete-Time Signals & z-Transform',['L12 slides','R11'],String.raw`
 <p>z-transform $X(z)=\sum_k x_k z^{-k}$ 把 difference equation 变成代数式。unit delay 对应 $z^{-1}$，所以数字 controller 最自然的实现语言其实是 delay elements + multiplications + additions。</p>
 <p>DT transfer function poles 在 unit disk 内对应 stability。frequency response 在 unit circle $z=e^{j\Omega}$ 上读取，其中 discrete normalized frequency $\Omega=\omega T$。</p>
 <p>不要把 continuous $j\omega$ axis 和 discrete unit circle 当成两个无关世界：exact mode mapping 是 $z=e^{sT}$。</p>`),
 S('12.4','Indirect Design & Emulation Approach',['L12 slides','B12','R11'],String.raw`
 <p>emulation：先按 CT 方法设计 $C(s)$，再把 controller discretize 成 $C_d(z)$。常用 substitutions 包括 forward Euler、backward Euler、Tustin/bilinear。</p>
 <p>Tustin 用 $s\approx\frac{2}{T}\frac{z-1}{z+1}$，会把 LHP 映进 unit disk，稳定性映射较好，但 frequency 会 warp；需要时可 prewarp 指定 frequency。</p>
 <p>课程 summary 给出实用经验：sampling angular frequency 最好显著高于 closed-loop bandwidth，例如 $\omega_s\gtrsim25\omega_{bw}$ 的量级规则。它不是严格 theorem，而是给 emulation 留足 phase/time-resolution 裕度。</p>`),
 S('12.5','Review: Concepts from Discrete-Time LTI Systems',['L12 slides','R11'],String.raw`
 <p>DT state-space solution：$x_k=A_d^kx_0+\sum_{i=0}^{k-1}A_d^{k-1-i}B_du_i$。controllability/observability/pole placement 都有与 CT 平行的形式，只是稳定区域从 LHP 换成 unit disk。</p>
 <p>deadbeat control 把 closed-loop poles 放到 0，使理想线性 model 在有限 samples 内到达 target。代价通常是 aggressive control、noise sensitivity 与 saturation risk。</p>`),
 S('12.6','Sampled-Data Systems II · Zero-Order Hold Equivalent',['L12 slides','B12','R11'],String.raw`
 <p>ZOH 假设每个 sample interval 内 control command 保持常数。exact state-space equivalent：</p><p class="cs-equation">$$A_d=e^{AT},\qquad B_d=\int_0^T e^{A\tau}B\,d\tau.$$</p>
 <div class="cs-derivation"><strong>为什么是这个式子</strong><div class="step"><span>1</span><div>CT solution：$x((k+1)T)=e^{AT}x(kT)+\int_0^T e^{A(T-\sigma)}Bu_k d\sigma$。</div></div><div class="step"><span>2</span><div>$u_k$ 在 interval 内 constant，可以提出积分。</div></div><div class="step"><span>3</span><div>变量替换得到上面的 $A_d,B_d$。</div></div></div>
 <p>SISO transfer-function ZOH equivalent 可写成 step-invariance 形式 $G_d(z)=(1-z^{-1})\mathcal Z\{G(s)/s\}$。</p>`),
 S('12.7','Direct Design of Discrete-Time Controllers',['L12 slides','R11'],String.raw`
 <p>direct design 不先设计 continuous controller，而是直接在 z-plane 指定 DT poles/zeros 或用 DT state-space synthesis。这样 sampling effects 从一开始就在模型里。</p>
 <p>continuous performance spec 可先映射：desired $s$-plane pole 通过 $z=e^{sT}$ 变成 z-plane target。随后可用 root locus、pole placement、LQR 等 DT versions。</p>
 <p>最后必须落到 difference equation，检查 coefficient quantization、computation delay、saturation、sampling jitter。一个在 symbolic z-domain 很漂亮的 controller，如果每个 sample 算不完，就不是可实现 controller。</p>`)
 ]};

U['13']={
 note:'PPT 13.1–13.4 + B13 + R12。重点补齐原网页缺失的 LQR 完整 verification、drone/double-integrator tuning、Pareto trade-off、robustness 与 extensions。',
 sections:[
 S('13.1','Control Performance · 为什么 pole placement 不是完整设计标准',['L13 slides','L13 annotated','B13','R12'],String.raw`
 <p>pole placement 只指定 eigenvalues，不直接衡量 state transient、control effort、disturbance/noise amplification。non-normal matrix 即使 eigenvalues 相同，也可产生截然不同的 transient。</p>
 <p>LQR 改问：什么 behavior 值得？用 cost 把 state deviation 和 actuator effort 明确量化，再让 optimization 选 feedback gain，而不是先猜 poles。</p>
 <div class="cs-source-example"><span class="cs-label">Drone motivation</span><p>PPT 用无人机/位置 dynamics 展示：同一个 plant 可以选不同 $Q/R$，得到从“激进快速”到“温和省控制量”的一族 optimal trajectories。不存在脱离 cost 定义的绝对“最好 controller”。</p></div>`),
 S('13.2','Design of the Optimal Controller (LQR)',['L13 slides','L13 annotated','B13','R12'],String.raw`
 <p>infinite-horizon CT LQR：</p><p class="cs-equation">$$\min_u J=\int_0^\infty(x^TQx+u^TRu)dt,\quad \dot x=Ax+Bu,$$</p><p>其中 $Q\succeq0,R\succ0$。解是 $u^*=-Kx$，$K=R^{-1}B^TP$，$P$ 满足 ARE</p><p class="cs-equation">$$A^TP+PA-PBR^{-1}B^TP+Q=0.$$</p>
 <div class="cs-derivation"><strong>按 PPT verification 的“完成平方”证明，不跳步</strong><div class="step"><span>1</span><div>从 cost 中减去由 ARE 表示的 0：$x^T[A^TP+PA-PBR^{-1}B^TP+Q]x$。</div></div><div class="step"><span>2</span><div>把 $Ax+Bu=\dot x$ 加进来并重排，使一部分变成 $\dot x^TPx+x^TP\dot x=\frac d{dt}(x^TPx)$。</div></div><div class="step"><span>3</span><div>剩下 control terms 完成平方：$(u+R^{-1}B^TPx)^TR(u+R^{-1}B^TPx)$。</div></div><div class="step"><span>4</span><div>积分 total derivative，得到 boundary term $x_0^TPx-x(\infty)^TPx(\infty)$。</div></div><div class="step"><span>5</span><div>因 $R\succ0$，square term 最小值为 0，只在 $u=-R^{-1}B^TPx$ 时取得。</div></div></div>
 <p>finite-horizon 情况 $P(t)$ 满足 differential Riccati equation 并从 terminal condition 向后积分；gain $K(t)$ 因而 time-varying。</p>
 <p>存在 stabilizing infinite-horizon solution 需要 $(A,B)$ stabilizable，并要求 $(Q^{1/2},A)$ detectable，避免“unstable mode 既控不到/又不计代价”的问题。</p>`),
 S('13.3','Stability & Robustness of LQR',['L13 slides','B13','R12'],String.raw`
 <p>在标准 assumptions 下 LQR feedback stabilizes the plant。SISO continuous-time LQR 还有经典 return-difference robustness properties：通常可保证至少约 $60^\circ$ phase margin 和无限 gain margin（在标准 full-state LQR loop assumptions 下）。</p>
 <p>这不是说“LQR 永远鲁棒”。state estimation、unmodeled dynamics、actuator saturation、MIMO loop interpretation 都会改变结论；LQG 尤其不会继承同样的简单 robustness guarantee。</p>
 <p>PPT 的 tuning plots 很重要：改变 $r/q$ 时，state cost 与 control cost 沿 Pareto curve 交换。$Q$ 大 / $R$ 小通常更 aggressive；但真正有意义的是 relative scaling 和 units。</p>
 <div class="cs-source-example"><span class="cs-label">Double integrator tuning</span><p>对 position/velocity system，把 $q_1$ 提高会更强烈惩罚 position error，closed-loop poles 通常向更快方向移动，同时 $\int u^2dt$ 增大。把结果画成 state-cost vs control-cost，比只看一个 $K$ 数字更能理解 tuning。</p></div>`),
 S('13.4','Appendix: Extensions of the LQR Problem',['L13 slides','R12'],String.raw`
 <p>常见 extensions：finite horizon、discrete-time LQR、cross term、tracking/regulation around nonzero equilibrium、time-varying systems。DT infinite-horizon LQR 的 Riccati equation 变成 DARE，gain 形式也包含 $R+B^TPB$。</p>
 <p>reference tracking 可以通过 equilibrium shift、prefilter、integral augmentation，或把 problem 写成 trajectory tracking optimal control。LQR 本身是 regulator，不会自动知道你想跟踪哪个非零 reference。</p>
 <p>工程上还常做 Bryson-like scaling：先用可接受最大 state/control 幅值把变量 nondimensionalize，再调 relative weights，避免 Q/R 只是因为单位不同而失真。</p>`)
 ]};

U['14']={
 note:'L14 slides + R13。L14 slides 以 sensor-fusion example 进入，没有像前几讲那样清晰的首页 14.1–14.n TOC；这里按课件实际顺序映射：sensor fusion → stochastic observer → Kalman-Bucy → innovation/covariance → DT Kalman → LQG。',
 sections:[
 S('PPT opening','Motivating Example: Sensor Fusion',['L14 slides','R13'],String.raw`
 <p>课件从 autonomous-car sensor fusion 出发：model 能预测 position/velocity，但受 process disturbance $w$；sensor 给 measurement，却受 measurement noise $v$。两者都不完美。</p>
 <p>Kalman 的核心不是“选 model 还是选 sensor”，而是用 covariance 衡量不确定性：model uncertainty 大时更信 sensor，sensor noise 大时更信 prediction。</p>
 <div class="cs-source-example"><span class="cs-label">两种 sensor</span><p>GPS position 慢但绝对；IMU acceleration 快但积分会 drift。fusion 的价值就在于把不同 error structure 组合，而不是简单平均。</p></div>`),
 S('Observer recap','From Luenberger Observer to a Stochastic Estimator',['L14 slides','R13'],String.raw`
 <p>deterministic observer 是 $\dot{\hat x}=A\hat x+Bu+L(y-C\hat x)$。Kalman filter 保留完全相同的结构，但不再凭 pole placement 选 $L$，而是根据 process/measurement noise statistics 选择 mean-square-optimal gain。</p>
 <p>stochastic model 常写</p><p class="cs-equation">$$\dot x=Ax+Bu+w,\qquad y=Cx+v,$$</p><p>并假设 white zero-mean noise，covariances $E[ww^T]=Q\delta(\tau)$、$E[vv^T]=R\delta(\tau)$。这里的 $Q,R$ 和 LQR 的符号相似，但语义是 noise covariance，不是 design penalty。</p>`),
 S('Kalman–Bucy','Continuous-Time Kalman Filter & Riccati Equation',['L14 slides','R13'],String.raw`
 <p>continuous Kalman-Bucy estimator：</p><p class="cs-equation">$$\dot{\hat x}=A\hat x+Bu+L(t)(y-C\hat x),\qquad L(t)=P(t)C^TR^{-1}.$$</p>
 <p>error covariance $P=E[(x-\hat x)(x-\hat x)^T]$ 满足 Riccati differential equation</p><p class="cs-equation">$$\dot P=AP+PA^T+Q-PC^TR^{-1}CP.$$</p>
 <p>steady state 时令 $\dot P=0$，得到 estimator algebraic Riccati equation。结构与 LQR ARE 对偶：$A\leftrightarrow A^T$、$B\leftrightarrow C^T$。</p>
 <div class="cs-misconception"><strong>Q/R 不是“越小越好”</strong>它们描述你认为噪声有多大。把 $R$ 调小等于宣称 sensor 更可靠，Kalman gain 会增大；若这个假设错了，estimate 会追着 noise 跑。</div>`),
 S('Innovation','Innovation, Covariance, and the Meaning of Optimality',['L14 slides','R13'],String.raw`
 <p>innovation $\tilde y=y-C\hat x^-$ 是“sensor 实际看到的”减去“model 预测应该看到的”。Kalman update 只使用这份新信息。</p>
 <p>innovation covariance $S=CP^-C^T+R$ 同时包含 predicted-state uncertainty 与 measurement noise。DT Kalman gain $K=P^-C^TS^{-1}$ 因此是自动的 uncertainty weighting。</p>
 <p>“optimal” 指在给定 linear model、noise assumptions 下最小化 mean-square estimation error。若噪声严重 non-Gaussian、model bias 很大或 covariance 估错，filter 仍可运行，但理论 optimality 不再成立。</p>`),
 S('Discrete KF','Discrete-Time Kalman Filter: Predict → Correct',['L14 slides','R13'],String.raw`
 <p>DT model：$x_{k+1}=Ax_k+Bu_k+w_k,\ y_k=Cx_k+v_k$。每个 sample 分两步：</p>
 <div class="cs-derivation"><strong>Predict</strong><div class="step"><span>1</span><div>$\hat x_k^-=A\hat x_{k-1}^+ + Bu_{k-1}$。</div></div><div class="step"><span>2</span><div>$P_k^-=AP_{k-1}^+A^T+Q$。</div></div></div>
 <div class="cs-derivation"><strong>Correct</strong><div class="step"><span>1</span><div>$K_k=P_k^-C^T(CP_k^-C^T+R)^{-1}$。</div></div><div class="step"><span>2</span><div>$\hat x_k^+=\hat x_k^-+K_k(y_k-C\hat x_k^-)$。</div></div><div class="step"><span>3</span><div>$P_k^+=(I-K_kC)P_k^-$（数值实现常用 Joseph form 保证 symmetry/PSD）。</div></div></div>
 <p>steady-state DT filter 可通过 DARE 求 constant gain；transient filter 则每步更新 covariance。</p>`),
 S('LQG','LQG: LQR + Kalman Filter + Separation',['L14 slides','R13'],String.raw`
 <p>当 full state 不可测时，用 Kalman estimate 做 LQR：$u=-K_{LQR}\hat x$，形成 Linear-Quadratic-Gaussian (LQG) controller。separation principle 允许 controller Riccati 与 estimator Riccati 分别求解。</p>
 <p>但“分别最优 + 分别稳定”不等于 closed-loop robustness 自动完美。LQG 可以对 model uncertainty 较敏感，因此工程上仍需检查 loop margins、noise channels、saturation 和 estimator/controller bandwidth interaction。</p>
 <div class="cs-source-callout"><strong>课程终点的统一视角</strong>LQR 决定“如果 state 知道，最值得怎么控制”；Kalman 决定“如果 state 不知道，最值得怎么估计”；LQG 把两者通过 separation principle 接起来。</div>`)
 ]};

window.sourceComplete=root;
window.sourceCompleteBReady=true;
})();