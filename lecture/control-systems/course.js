const courseUnits = [
{
id:'01',title:'建模、状态与线性化',question:'一个真实物理系统，怎样一步步变成可以分析和设计控制器的数学模型？',
body:`<div class="cs-goals"><strong>学习目标</strong><ul><li>从守恒律或 Newton/Kirchhoff 定律写出非线性 ODE。</li><li>理解 state、input、output、equilibrium 的区别。</li><li>能在工作点附近做 Jacobian 线性化。</li><li>能解释线性模型为什么有用，以及它什么时候会失效。</li></ul></div>
<h2 id="model">1. 控制首先是“描述系统如何演化”</h2><p>连续时间动力系统通常写成 $\\dot x=f(x,u),\;y=h(x,u)$。这里 $x$ 不是“你能测到的所有量”，而是<strong>给定当前状态和未来输入后，足以预测未来</strong>的一组最小变量。对机械系统，位置和速度往往构成状态；对 RLC 电路，电容电压和电感电流往往构成状态。</p><p>控制问题中的输入 $u$ 是你可以操纵的量，输出 $y$ 是传感器或任务真正关心的量。一个常见错误是把 output 当成 state：输出只是状态的某个函数，可能只有一部分信息。</p>
<div class="cs-example"><span class="cs-label">Worked example · mass–spring–damper</span><strong>从 Newton 定律到状态空间</strong><p>质量 $m$、弹簧 $k$、阻尼 $c$，控制力为 $u$，位移为 $q$：</p><p class="cs-equation">$$m\\ddot q+c\\dot q+kq=u.$$</p><p>令 $x_1=q,\;x_2=\\dot q$，得到</p><p class="cs-equation">$$\\dot x=\\begin{bmatrix}0&1\\\\-k/m&-c/m\\end{bmatrix}x+\\begin{bmatrix}0\\\\1/m\\end{bmatrix}u,\qquad y=\\begin{bmatrix}1&0\\end{bmatrix}x.$$</p><p>二阶微分方程因此变成两个一阶状态方程。这不是形式游戏：之后 controllability、observer、LQR 都直接作用于 $(A,B,C,D)$。</p></div>
<h2 id="equilibrium">2. 平衡点：你究竟想把系统稳定在哪里？</h2><p>平衡点 $(x^*,u^*)$ 满足 $f(x^*,u^*)=0$。如果系统停在这个状态并持续施加 $u^*$，它不会继续变化。很多控制器其实是在做一件事：让一个原本不稳定或容易漂移的平衡点成为闭环中的稳定平衡点。</p><p>例如倒立摆直立位置就是一个典型不稳定平衡点：完全直立时净力矩可以为零，但任何小扰动都会让它倒下。</p>
<h2 id="linearization">3. Jacobian 线性化</h2><p>在 $x^*,u^*$ 附近写 $x=x^*+\\delta x,\;u=u^*+\\delta u$。对 $f$ 一阶 Taylor 展开：</p><p class="cs-equation">$$\\delta\\dot x=A\\delta x+B\\delta u,$$</p><p class="cs-equation">$$A=\\left.\\frac{\\partial f}{\\partial x}\\right|_{x^*,u^*},\qquad B=\\left.\\frac{\\partial f}{\\partial u}\\right|_{x^*,u^*}.$$</p><p>输出同理：$\\delta y=C\\delta x+D\\delta u$。这一步把非线性系统局部变成 LTI 模型。</p>
<div class="cs-example"><span class="cs-label">Worked example · nonlinear tank</span><strong>水箱为什么线性化后是一阶系统？</strong><p>横截面积 $A_t$，输入流量 $q$，出流 $k\\sqrt h$：</p><p class="cs-equation">$$A_t\\dot h=q-k\\sqrt h.$$</p><p>平衡条件 $q^*=k\\sqrt{h^*}$。令 $\\delta h=h-h^*,\;\\delta q=q-q^*$，则</p><p class="cs-equation">$$A_t\\delta\\dot h=\\delta q-\\frac{k}{2\\sqrt{h^*}}\\delta h.$$</p><p>整理为 $\\delta\\dot h=-a\\delta h+b\\delta q$。你可以直接读出时间常数 $\\tau=1/a$。注意：若水位离 $h^*$ 很远，这个时间常数就不再准确。</p></div>
<h2 id="solution">4. LTI 状态方程如何演化</h2><p>对 $\\dot x=Ax+Bu$，零输入时 $x(t)=e^{At}x(0)$。因此 $A$ 的特征值决定自然模态：实部为负的模态衰减，实部为正的模态发散，纯虚特征值会产生持续振荡。</p><div class="cs-formulas"><span class="cs-label">Key formulas</span><strong>这一讲应能熟练使用</strong><p>$\\dot x=f(x,u)$；$f(x^*,u^*)=0$；$A=\\partial f/\\partial x$；$B=\\partial f/\\partial u$；$x(t)=e^{At}x(0)+\\int_0^t e^{A(t-\\tau)}Bu(\\tau)d\\tau$。</p></div>
<h2 id="pitfalls">5. 常见坑</h2><ul><li><strong>线性化不是“把非线性删掉”。</strong>它只在某个工作点附近近似。</li><li><strong>状态的选择不是唯一的。</strong>不同坐标可描述同一系统。</li><li><strong>模型正确不等于模型有用。</strong>控制设计关心的是目标频段和工作区域内足够准确。</li></ul>
<div class="cs-practice"><strong>练习</strong><ol><li>把 $m\\ddot q+c\\dot q+kq=u$ 写成状态空间，并说明若输出是速度，$C$ 应如何改变。</li><li>系统 $\\dot x=x-x^3+u$ 在 $u^*=0$ 时有哪些平衡点？分别线性化并判断局部稳定性。</li><li>为什么倒立摆直立点的线性模型可以用于设计平衡控制器，却不能描述摆杆完整转圈？</li></ol><details><summary>答案提示</summary><p>第 2 题：平衡点 $x^*=0,\\pm1$；线性化系数为 $1-3(x^*)^2$。看系数正负即可判断局部行为。</p></details></div>
<div class="cs-reading"><strong>对应阅读</strong>Åström & Murray, <em>Feedback Systems</em>：Introduction、System Modeling、Dynamic Behavior；ETH 课程开头关于 modeling / linearization 的公开录像。</div>`
},
{
id:'02',title:'传递函数、极点与零点',question:'为什么同一个系统既要会写状态空间，又要会看 transfer function、pole 和 zero？',
body:`<div class="cs-goals"><strong>学习目标</strong><ul><li>从状态空间推到 transfer function。</li><li>用 pole 读出时间尺度、阻尼和稳定性。</li><li>理解 zero，尤其是右半平面零点的限制。</li><li>掌握一阶/二阶标准系统与主导极点近似。</li></ul></div>
<h2 id="laplace">1. Laplace：把微分方程变成代数方程</h2><p>零初值下，$\\mathcal L\\{\\dot x\\}=sX(s)$。对于 $\\dot x=Ax+Bu,\;y=Cx+Du$：</p><p class="cs-equation">$$(sI-A)X=BU,\qquad Y=CX+DU.$$</p><p>因此</p><p class="cs-equation">$$G(s)=\\frac{Y(s)}{U(s)}=C(sI-A)^{-1}B+D.$$</p><p>transfer function 忽略了内部状态坐标，只保留输入输出关系，所以在 SISO 闭环设计里特别方便。</p>
<h2 id="firstsecond">2. 一阶和二阶系统必须形成直觉</h2><p>一阶系统</p><p class="cs-equation">$$G(s)=\\frac{K}{\\tau s+1}$$</p><p>对单位阶跃的响应是 $y(t)=K(1-e^{-t/\\tau})$。$t=\\tau$ 时到最终值约 63%，$4\\tau$ 左右基本收敛。</p><p>二阶标准型</p><p class="cs-equation">$$G(s)=\\frac{\\omega_n^2}{s^2+2\\zeta\\omega_n s+\\omega_n^2}.$$</p><p>$\\omega_n$ 决定时间尺度，$\\zeta$ 决定阻尼。$0<\\zeta<1$ 时有超调，近似超调量</p><p class="cs-equation">$$M_p\\approx e^{-\\pi\\zeta/\\sqrt{1-\\zeta^2}}.$$</p>
<div class="cs-table-wrap"><table class="cs-table"><thead><tr><th>阻尼比</th><th>典型行为</th></tr></thead><tbody><tr><td>$\\zeta=0$</td><td>持续振荡</td></tr><tr><td>$0<\\zeta<1$</td><td>衰减振荡、有超调</td></tr><tr><td>$\\zeta=1$</td><td>临界阻尼</td></tr><tr><td>$\\zeta>1$</td><td>无振荡但较慢</td></tr></tbody></table></div>
<h2 id="poles">3. Pole 是系统的自然模态</h2><p>若 $G=N/D$，$D(s)=0$ 的根是 poles。对有理 LTI 系统，极点位置直接决定自然响应。左半平面极点衰减，右半平面极点发散。越靠近虚轴，模态越慢。</p><div class="cs-example"><span class="cs-label">Worked example</span><strong>从极点估计 settling time</strong><p>闭环主导极点是 $-2\\pm j3$。实部 $-2$ 给出包络 $e^{-2t}$。若以 2% settling time 粗估 $T_s\\approx4/2=2$ s。振荡角频率约 $3$ rad/s。</p></div>
<h2 id="zeros">4. Zero 为什么能限制性能</h2><p>zero 是 $N(s)=0$ 的根。左半平面零点通常改变幅相特性；右半平面 zero 更麻烦，因为它带来 non-minimum-phase 行为。典型现象是 inverse response：你想让输出上升，系统却先往反方向动。</p><p>右半平面零点本质上限制了你能把闭环做多快。若 crossover 频率硬推到远高于 RHP zero，通常会付出严重相位损失与鲁棒性问题。</p>
<h2 id="cancellation">5. Pole-zero cancellation 要非常谨慎</h2><p>数学上可以用 controller zero 抵消 plant pole，但如果那个 pole 不稳定，任何微小建模误差都会留下一个不稳定残差。因此<strong>不要用精确 cancellation 隐藏不稳定动力学</strong>。</p>
<div class="cs-practice"><strong>练习</strong><ol><li>求 $G(s)=1/(s^2+4s+13)$ 的极点，并估计衰减速度和振荡频率。</li><li>把 $A=\\begin{bmatrix}0&1\\\\-2&-3\\end{bmatrix},B=[0\;1]^T,C=[1\;0]$ 转为 transfer function。</li><li>为什么 $G(s)=(1-s)/(1+s)$ 虽然 pole 稳定，却不适合“无限快”跟踪？</li></ol><details><summary>答案提示</summary><p>第 1 题极点 $-2\\pm j3$。第 3 题 zero 在 $+1$，是 RHP zero。</p></details></div>
<div class="cs-reading"><strong>对应阅读</strong>Feedback Systems：Linear Systems、Transfer Functions、Dynamic Behavior。</div>`
},
{
id:'03',title:'反馈、灵敏度与稳态误差',question:'反馈为什么能提高鲁棒性和扰动抑制，却又不能在所有频率上“什么都做到最好”？',
body:`<div class="cs-goals"><strong>学习目标</strong><ul><li>推导闭环 transfer functions。</li><li>理解 sensitivity $S$ 与 complementary sensitivity $T$。</li><li>会分析 reference、disturbance、measurement noise 三条通道。</li><li>会用 system type / final value theorem 判断稳态误差。</li></ul></div>
<h2 id="loop">1. 单位负反馈的核心代数</h2><p>令 plant 为 $P$，controller 为 $C$，loop transfer $L=PC$。误差 $e=r-y$，控制输入 $u=Ce$，输出 $y=Pu$。因此</p><p class="cs-equation">$$y=PC(r-y)\\Rightarrow (1+L)y=Lr.$$</p><p>于是</p><p class="cs-equation">$$T(s)=\\frac{y}{r}=\\frac{L}{1+L},\qquad S(s)=\\frac{e}{r}=\\frac{1}{1+L},\qquad S+T=1.$$</p>
<h2 id="channels">2. Reference、disturbance、noise 必须分开</h2><p>如果 plant 输入端有 disturbance $d$，测量端有 noise $n$，则典型闭环关系可整理为</p><p class="cs-equation">$$y=Tr+PSd-Tn.$$</p><p>因此：</p><ul><li>低频 tracking 好：希望 $|T|\\approx1$。</li><li>低频 disturbance rejection 好：希望 $|S|$ 小。</li><li>高频 measurement noise 不被放大：希望 $|T|$ 小。</li></ul><p>由于 $S+T=1$，这三个要求不能在所有频率同时满足。设计的本质是<strong>在不同频段分配性能</strong>。</p>
<h2 id="steady">3. 稳态误差与积分器</h2><p>利用 final value theorem，若闭环稳定：</p><p class="cs-equation">$$e_{ss}=\\lim_{t\\to\\infty}e(t)=\\lim_{s\\to0}sE(s).$$</p><p>对于单位阶跃 $R=1/s$，$E=SR$，所以 $e_{ss}=S(0)$。如果 loop 中含一个积分器，使 $|L(0)|\\to\\infty$，则 $S(0)=0$，阶跃稳态误差被消除。</p><div class="cs-example"><span class="cs-label">Worked example</span><strong>比例控制为什么消不掉常值误差？</strong><p>Plant $P(s)=1/(s+1)$，P controller $C=K$。对单位阶跃，</p><p class="cs-equation">$$S(0)=\\frac1{1+K}.$$</p><p>无论 $K$ 多大，只要有限，误差都不是 0。换成 PI 后，DC loop gain 趋于无穷，理想线性模型下稳态误差为 0。</p></div>
<h2 id="robust">4. Sensitivity 为什么代表鲁棒性</h2><p>考虑 plant 的小相对变化。闭环 transfer $T=L/(1+L)$ 对 plant 的相对敏感度正比于 $S$。直觉上：若某频率 $|L|\\gg1$，闭环主要由 feedback 定义，而不是精确 plant 参数定义。</p><p>但 Bode sensitivity integral 告诉我们，稳定 minimum-phase 系统也存在“waterbed effect”：在一些频段把 $|S|$ 压得很低，往往会在另一些频段鼓起来。</p>
<h2 id="tradeoffs">5. 为什么高增益不是万能药</h2><ul><li>高 loop gain 可能降低稳定裕度。</li><li>高频高增益会放大 measurement noise。</li><li>会驱动未建模的柔性模态和延迟。</li><li>会要求执行器输出更大，导致 saturation。</li></ul>
<div class="cs-practice"><strong>练习</strong><ol><li>对 $P=1/(s+1),C=10$ 计算 $S(0),T(0)$。</li><li>若 $L(j\\omega)$ 在低频很大、高频很小，分别解释对 tracking 和 noise 的影响。</li><li>为什么积分器改善低频误差，却常损害相位裕度？</li></ol><details><summary>答案提示</summary><p>第 1 题 $S(0)=1/11,T(0)=10/11$。</p></details></div>
<div class="cs-reading"><strong>对应阅读</strong>Feedback Systems：Feedback Principles、State/Output Feedback、Robust Performance。</div>`
},
{
id:'04',title:'PID：从作用机理到可实现控制器',question:'为什么 PID 只看误差的现在、过去和变化趋势，却能覆盖大量工业控制问题？',
body:`<div class="cs-goals"><strong>学习目标</strong><ul><li>理解 P/I/D 各自改变什么。</li><li>会从频域解释 PI/PID。</li><li>掌握 filtered derivative、set-point weighting、anti-windup。</li><li>知道 Ziegler–Nichols 的作用和局限。</li></ul></div>
<h2 id="pid">1. 理想 PID</h2><p class="cs-equation">$$u(t)=K_pe(t)+K_i\\int_0^te(\\tau)d\\tau+K_d\\dot e(t).$$</p><p>Laplace 域写为 $C(s)=K_p+K_i/s+K_ds$。</p><div class="cs-table-wrap"><table class="cs-table"><thead><tr><th>项</th><th>主要作用</th><th>典型副作用</th></tr></thead><tbody><tr><td>P</td><td>提高响应速度、减小误差</td><td>过大时振荡/不稳定</td></tr><tr><td>I</td><td>消除低频稳态误差</td><td>相位滞后、windup</td></tr><tr><td>D</td><td>增加阻尼、相位提前</td><td>放大高频噪声</td></tr></tbody></table></div>
<h2 id="pi">2. PI 为什么如此常见</h2><p>过程工业中的 plant 往往低通、慢、没有强烈振荡模态。PI 用积分保证 zero steady-state error，再用比例项调响应速度，已能满足大量需求。</p><p>标准 PI：</p><p class="cs-equation">$$C(s)=K_p\\left(1+\\frac1{T_i s}\\right).$$</p><p>其 zero 在 $s=-1/T_i$。通过安排这个 zero，可以部分补偿 plant 的慢 pole 并提升低频 gain。</p>
<h2 id="derivative">3. 实际微分项必须滤波</h2><p>理想 $K_ds$ 在 $\\omega\\to\\infty$ 时 gain 无界，噪声会被无限放大。工程实现常写成</p><p class="cs-equation">$$C_D(s)=K_d\\frac{s}{1+s/\\omega_f}.$$</p><p>高频后 gain 不再继续上升。另一个常见做法是 derivative on measurement，而不是 derivative on error，以避免 reference step 引发 derivative kick。</p>
<h2 id="zn">4. Ziegler–Nichols：快速初值，不是最终设计</h2><p>一种经典方法是不断提高 P gain，直到闭环出现持续振荡，记录 ultimate gain $K_u$ 和周期 $T_u$，再按经验表给出 PI/PID 初值。优点是无需精确模型；缺点是常较激进，超调大，而且把系统推到稳定边缘做实验并不总是安全。</p>
<h2 id="windup">5. Saturation 与 integral windup</h2><p>执行器存在 $u_{min}\\le u\\le u_{max}$。一旦饱和，积分器仍继续积累误差，导致内部 integrator state 远超合理范围。之后即使误差变号，控制器也需要很久才能“解卷”。</p><p>常见 anti-windup：</p><ul><li>conditional integration：饱和且误差让饱和更严重时停止积分。</li><li>back-calculation：用 $u_{sat}-u$ 反馈给 integrator state。</li></ul>
<div class="cs-example"><span class="cs-label">Worked example</span><strong>一阶 plant 的 PI 设计直觉</strong><p>$P=1/(5s+1)$。若希望闭环明显加快，可把 PI zero 放在 plant pole 附近，例如 $T_i=5$，得到 $C=K_p(5s+1)/(5s)$。理想模型下有 pole-zero cancellation，loop 约为 $K_p/(5s)$，闭环成为一阶。实际设计中不会把 cancellation 当成精确事实，而会保留鲁棒裕度并验证参数变化。</p></div>
<div class="cs-practice"><strong>练习</strong><ol><li>为什么纯 P 对 type-0 plant 通常无法消除 step error？</li><li>为什么 derivative 对 measurement 比 derivative 对 error 更适合有 step reference 的系统？</li><li>解释 anti-windup back-calculation 的物理意义。</li></ol></div>
<div class="cs-reading"><strong>对应阅读</strong>Feedback Systems：PID Control；ETH 公开录像中的 PID / integral action / saturation 部分。</div>`
},
{
id:'05',title:'稳定性、Routh–Hurwitz 与 Root Locus',question:'不依赖时域仿真，怎样判断闭环稳定，以及增益变化会把极点推到哪里？',
body:`<div class="cs-goals"><strong>学习目标</strong><ul><li>区分 BIBO stability 与内部稳定。</li><li>用 Routh–Hurwitz 判断右半平面根个数。</li><li>掌握 root locus 基本规则。</li><li>从主导极点估计 settling time 与 overshoot。</li></ul></div>
<h2 id="stability">1. 闭环稳定性来自特征方程</h2><p>单位负反馈闭环 denominator 是 $1+L(s)=0$。如果所有闭环 poles 严格在左半平面，有限维连续 LTI 系统指数稳定。</p><p>注意：transfer function 看起来稳定，不一定意味着所有内部状态都稳定。如果发生不稳定 pole-zero cancellation，输入输出关系可能隐藏内部发散模态。</p>
<h2 id="routh">2. Routh–Hurwitz：不求根也能判断稳定</h2><p>对多项式</p><p class="cs-equation">$$a_ns^n+a_{n-1}s^{n-1}+\\cdots+a_0=0,$$</p><p>建立 Routh array。首列符号变化次数等于右半平面根数。</p><div class="cs-example"><span class="cs-label">Worked example</span><strong>找稳定增益范围</strong><p>特征方程 $s^3+2s^2+(1+K)s+K=0$。Routh 首列为</p><p class="cs-equation">$$1,\;2,\;\\frac{2(1+K)-K}{2},\;K.$$</p><p>稳定要求全部同号，因此 $K>0$ 且 $2+K>0$，所以 $K>0$。这个例子说明 Routh 很适合直接求 controller gain 的稳定区间。</p></div>
<h2 id="rootlocus">3. Root locus：把 $K$ 当旋钮</h2><p>对 $L(s)=K L_0(s)$，closed-loop poles 满足 $1+KL_0(s)=0$。root locus 描述 $K:0\\to\\infty$ 时这些 poles 的轨迹。</p><p>基本规则：</p><ul><li>分支从 open-loop poles 出发。</li><li>终点是 open-loop zeros 或无穷远。</li><li>实轴上，某点右侧若有奇数个实 pole/zero，则该点属于 locus。</li><li>无穷远渐近线数量 = poles 数 − zeros 数。</li></ul>
<h2 id="performance">4. 极点位置与性能</h2><p>对于主导共轭极点 $s=-\\sigma\\pm j\\omega_d$：</p><p class="cs-equation">$$T_s\\approx\\frac4\\sigma,\qquad \\zeta=\\frac{\\sigma}{\\sqrt{\\sigma^2+\\omega_d^2}}.$$</p><p>因此 root locus 不只是“稳定性图”，还让你直接看出 gain 改变后速度和阻尼怎样变化。</p>
<h2 id="compensator">5. 为什么加 zero 可以“拉”根轨迹</h2><p>root locus 满足 angle condition。controller zero 会贡献相位，使 locus 朝 zero 方向弯曲；controller pole 则通常把 locus 拉向自身。这是 lead/lag compensator 几何直觉的来源。</p>
<div class="cs-practice"><strong>练习</strong><ol><li>对特征多项式 $s^3+3s^2+2s+K$ 用 Routh 求稳定 $K$ 范围。</li><li>对 $L=K/[s(s+2)]$ 写出 root locus 起点、终点和渐近线。</li><li>如果 dominant poles 从 $-1\\pm j2$ 移到 $-3\\pm j2$，settling time 和 overshoot 的趋势如何？</li></ol><details><summary>答案提示</summary><p>第 1 题 Routh 给出 $0<K<6$。</p></details></div>
<div class="cs-reading"><strong>对应阅读</strong>Feedback Systems：Stability Analysis、Root Locus 相关内容。</div>`
},
{
id:'06',title:'Bode、Nyquist 与 Stability Margins',question:'为什么看正弦稳态响应，就能判断闭环稳定性、速度和对延迟的容忍度？',
body:`<div class="cs-goals"><strong>学习目标</strong><ul><li>会手画基本 Bode asymptote。</li><li>理解 crossover、bandwidth、phase margin、gain margin。</li><li>掌握 Nyquist criterion 的核心逻辑。</li><li>理解 delay 为什么表现为额外 phase lag。</li></ul></div>
<h2 id="frequency">1. 频率响应的物理意义</h2><p>对稳定 LTI 系统输入 $u(t)=A\\sin\\omega t$，稳态输出仍是同频率正弦，只改变幅值和相位：</p><p class="cs-equation">$$y_{ss}(t)=A|G(j\\omega)|\\sin(\\omega t+\\angle G(j\\omega)).$$</p><p>因此 $G(j\\omega)$ 告诉你系统对不同时间尺度信号的响应。</p>
<h2 id="bode">2. Bode 图的基本积木</h2><ul><li>常数 $K$：幅值 $20\\log_{10}|K|$ dB，相位 0°（$K>0$）。</li><li>积分器 $1/s$：−20 dB/dec，相位 −90°。</li><li>一阶 pole $1/(1+s/\\omega_p)$：过 corner 后额外 −20 dB/dec，相位逐步趋近 −90°。</li><li>一阶 zero $1+s/\\omega_z$：过 corner 后 +20 dB/dec，相位趋近 +90°。</li></ul>
<div class="cs-example"><span class="cs-label">Worked example</span><strong>$G(s)=10/[s(1+s/5)]$ 的 Bode 直觉</strong><p>低频像积分器，斜率 −20 dB/dec。到 $5$ rad/s 后再加一个 pole，斜率变为 −40 dB/dec。相位从约 −90° 逐渐下降到 −180°。</p></div>
<h2 id="margins">3. Gain crossover 与 phase margin</h2><p>gain crossover $\\omega_c$ 满足 $|L(j\\omega_c)|=1$。phase margin 定义为</p><p class="cs-equation">$$PM=180^\\circ+\\angle L(j\\omega_c).$$</p><p>直观地说，PM 表示在 crossover 处还能容忍多少额外 phase lag 才到 −180°。较大的 PM 通常意味着更好的阻尼和 delay robustness。</p><p>gain margin 则是在 phase = −180° 的频率上，gain 距离 0 dB 还有多少余量。</p>
<h2 id="nyquist">4. Nyquist：为什么 −1 点如此关键</h2><p>闭环 denominator 是 $1+L(s)$，所以闭环不稳定对应 $L(s)=-1$。Nyquist criterion 用 open-loop $L(s)$ 对 Nyquist contour 的映射绕 −1 点的次数，结合 open-loop RHP poles 数量，判断 closed-loop RHP poles 数量。</p><p>常用记忆不是公式本身，而是：<strong>开环频率响应离 −1 点越危险，闭环越接近失稳。</strong></p>
<h2 id="delay">5. Delay 为什么危险</h2><p>纯延迟 $e^{-sT}$ 的幅值恒为 1，但相位是 $-\\omega T$。因此延迟不会改变 Bode magnitude，却会不断吃掉高频 phase margin。控制系统经常不是“gain 太大”而失稳，而是“gain 把 crossover 推太高，以至于 delay phase lag 变得致命”。</p>
<div class="cs-practice"><strong>练习</strong><ol><li>画 $1/[s(1+s)]$ 的渐近 Bode magnitude。</li><li>若 crossover 处 phase = −140°，phase margin 是多少？</li><li>一个 $T=0.1$ s 的 delay 在 $\\omega=5$ rad/s 造成多少相位滞后（rad 和 deg）？</li></ol><details><summary>答案提示</summary><p>第 2 题 40°。第 3 题 −0.5 rad，约 −28.6°。</p></details></div>
<div class="cs-reading"><strong>对应阅读</strong>Feedback Systems：Frequency Domain Analysis、Stability Margins。</div>`
},
{
id:'07',title:'Loop Shaping 与鲁棒性能',question:'怎样把“快速、少超调、抗扰、不过分放大噪声”翻译成 Bode 图上的设计目标？',
body:`<div class="cs-goals"><strong>学习目标</strong><ul><li>理解 loop shaping 的频段思想。</li><li>把 tracking/disturbance/noise 要求映射到 $S,T,CS$。</li><li>理解 lead/lag compensator。</li><li>掌握 bandwidth、robustness、control effort 的三方权衡。</li></ul></div>
<h2 id="targets">1. 先把性能要求翻译成频域语言</h2><p>常见闭环量：</p><p class="cs-equation">$$S=\\frac1{1+L},\quad T=\\frac{L}{1+L},\quad CS=\\frac{C}{1+L}.$$</p><p>典型目标：</p><ul><li>低频：$|S|$ 小 → tracking / disturbance rejection 好。</li><li>中频 crossover：足够 phase margin → 良好阻尼。</li><li>高频：$|T|$ 小 → measurement noise 和未建模高频 dynamics 不进入输出。</li><li>$|CS|$ 不宜过大 → 避免 control effort 和 actuator saturation。</li></ul>
<h2 id="crossover">2. Crossover 基本决定闭环速度</h2><p>对很多良好设计的 SISO 系统，closed-loop bandwidth 和 loop crossover 同量级。把 crossover 推高，系统通常更快；但同时更容易碰到 delay、RHP zero、flexible mode、sampling 等限制。</p>
<h2 id="lead">3. Lead compensator：换取相位裕度</h2><p>典型 lead：</p><p class="cs-equation">$$C_{lead}(s)=K\\frac{1+s/\\omega_z}{1+s/\\omega_p},\qquad \\omega_z<\\omega_p.$$</p><p>zero 先出现、pole 后出现，在两者之间提供正相位，提高 crossover 附近 phase margin。代价是高频 gain 会提高，可能放大 noise。</p>
<h2 id="lag">4. Lag compensator：提高低频 gain</h2><p>lag 常写成 pole 更靠近原点、zero 稍高频，使低频 gain 增强而 crossover 附近变化较小。它常用于改善稳态误差，但会引入额外相位滞后，因此位置要远低于 crossover。</p>
<div class="cs-example"><span class="cs-label">Design workflow</span><strong>一个实用的 loop-shaping 顺序</strong><ol><li>先根据 desired speed 选大致 crossover。</li><li>检查 plant 在该频率的 phase；若 margin 不够，用 lead。</li><li>检查低频 tracking / disturbance rejection；必要时加 integral 或 lag。</li><li>检查高频 roll-off、noise、unmodeled dynamics。</li><li>最后在 nonlinear simulation 中检查 saturation。</li></ol></div>
<h2 id="uncertainty">5. Multiplicative uncertainty 的直觉</h2><p>若真实 plant 写成 $P_{true}=P(1+W_m\\Delta)$ 且 $|\\Delta|\\le1$，一个经典 robust stability 条件与 $|W_mT|<1$ 有关。直觉是：模型越不可信的高频区域，$T$ 就应该越小。</p>
<div class="cs-practice"><strong>练习</strong><ol><li>为什么 lead 常用于“想更快但 phase margin 不够”的情况？</li><li>为什么 integral action 的 corner 通常放在 crossover 以下？</li><li>如果高频 plant uncertainty 很大，应怎样 shaping $T$？</li></ol></div>
<div class="cs-reading"><strong>对应阅读</strong>Feedback Systems：Frequency Domain Design、Robust Performance。</div>`
},
{
id:'08',title:'2-DOF、Feedforward、Cascade 与 IMC',question:'为什么一个 feedback controller 往往无法同时完美解决 tracking、disturbance rejection 和 actuator constraints？',
body:`<div class="cs-goals"><strong>学习目标</strong><ul><li>区分 feedback 与 feedforward 的职责。</li><li>理解 two-degree-of-freedom architecture。</li><li>掌握 cascade control 的设计顺序。</li><li>理解 IMC 的模型反演思想与限制。</li></ul></div>
<h2 id="feedforward">1. Feedback 是“看到误差再纠正”，feedforward 是“预先补偿”</h2><p>若扰动 $d$ 可测，且已知它到输出的 transfer $P_d$，可以设计 feedforward $F$ 让扰动影响在到达输出前被抵消。理想条件下令</p><p class="cs-equation">$$P_uF+P_d=0\\Rightarrow F=-P_u^{-1}P_d.$$</p><p>但精确反演可能不可实现：plant 可能有 RHP zeros、delay 或高阶 dynamics，所以实际 feedforward 常只在可实现频段近似。</p>
<h2 id="2dof">2. Two-degree-of-freedom：把 tracking 与 robustness 分开</h2><p>单 feedback controller 同时决定 set-point response 和 disturbance response。2-DOF 架构额外加入 reference prefilter 或 set-point weighting，使反馈环专注稳定性与抗扰，而 reference path 单独整形，减少 overshoot。</p>
<h2 id="cascade">3. Cascade control</h2><p>当系统存在明显的快内环变量和慢外环变量时，可以先设计 inner loop，再把闭合后的 inner loop 当作新的 plant 给 outer loop。</p><div class="cs-example"><span class="cs-label">Example</span><strong>电机速度–位置串级</strong><p>内环快速控制 motor speed，外环根据 position error 给出 speed reference。内环必须明显快于外环，否则层次分离失效。</p></div>
<h2 id="imc">4. Internal Model Control</h2><p>IMC 的思想是显式使用 plant model $\\hat P$。若模型精确且可逆，可以用 $Q\\approx\\hat P^{-1}$ 实现良好 tracking；实际设计会给逆模型加低通 filter，使 controller proper，并降低对高频不确定性的敏感性。</p><p>IMC 很有价值，因为它把“controller aggressiveness”与“model trust”直接联系起来：filter 越快，性能越强但鲁棒性越差。</p>
<h2 id="constraints">5. Saturation、rate limits 与 bumpless transfer</h2><p>真正工业控制器几乎总有 amplitude/rate constraints。模式切换时还要考虑 bumpless transfer，避免手动/自动切换造成巨大 control jump。控制器不是只在数学闭环里存在，它必须和 actuator、sensor、software state 一起设计。</p>
<div class="cs-practice"><strong>练习</strong><ol><li>为什么 feedforward 不能取代 feedback？</li><li>cascade 中为何先设计 inner loop？</li><li>为什么对有 RHP zero 的 plant 不能直接做精确 inverse feedforward？</li></ol></div>
<div class="cs-reading"><strong>对应阅读</strong>ETH syllabus 中 augmented architectures；Feedback Systems 中 feedforward / two-degree-of-freedom / implementation 相关章节。</div>`
},
{
id:'09',title:'MIMO、耦合、RGA 与 Decoupling',question:'多个 actuator 和多个 output 同时存在时，为什么简单地“每个 output 配一个 PID”常常会失败？',
body:`<div class="cs-goals"><strong>学习目标</strong><ul><li>理解 transfer matrix。</li><li>理解 input-output interaction。</li><li>会计算和解释 RGA。</li><li>理解 static/dynamic decoupling 的风险。</li></ul></div>
<h2 id="matrix">1. 从 scalar transfer function 到 transfer matrix</h2><p>MIMO 系统写成</p><p class="cs-equation">$$Y(s)=G(s)U(s),\qquad G(s)=\\begin{bmatrix}G_{11}&G_{12}\\\\G_{21}&G_{22}\\end{bmatrix}.$$</p><p>$G_{12}$ 表示 input 2 对 output 1 的影响。若 off-diagonal 项很大，两个单独 SISO loop 会彼此干扰。</p>
<h2 id="interaction">2. 为什么 pairing 很重要</h2><p>假设你选择 $u_1\\to y_1$、$u_2\\to y_2$ 两个 loops。关闭其中一个 loop 时，另一个 loop 实际看到的 plant 会变化。强 interaction 会导致一个 loop 调好后，另一个一闭合性能就恶化甚至失稳。</p>
<h2 id="rga">3. Relative Gain Array</h2><p>稳态 gain matrix $G(0)$ 的 RGA 定义为</p><p class="cs-equation">$$\\Lambda=G(0)\\circ(G(0)^{-T}),$$</p><p>其中 $\\circ$ 是 elementwise product。$\\lambda_{ij}$ 接近 1 往往表示 $u_j\\leftrightarrow y_i$ pairing 较自然；很大、负值或强烈偏离 1 表示 pairing 可能危险。</p><div class="cs-example"><span class="cs-label">Worked example</span><strong>2×2 steady-state pairing</strong><p>若 $G(0)=\\begin{bmatrix}1&0.2\\\\0.1&1\\end{bmatrix}$，off-diagonal 较小，RGA 会接近 identity，通常 diagonal pairing 合理。若矩阵接近奇异，RGA 元素可能很大，表示输入作用彼此高度相关，解耦和独立控制会非常敏感。</p></div>
<h2 id="decouple">4. Decoupling</h2><p>最直接的 static decoupling 是在低频构造 $D\\approx G(0)^{-1}$，让 $GD$ 接近对角。dynamic decoupling 则试图在频率上反演更完整的 $G(s)$。</p><p>风险和 SISO inverse 一样：RHP zeros、delay、高频不确定性都可能让精确 inverse 不可实现或不鲁棒。</p>
<h2 id="state">5. 为什么 MIMO 最终自然过渡到 state space</h2><p>transfer matrix 在小规模 frequency-domain design 中仍很有用，但 controllability、observability、LQR 等 state-space 工具更自然地处理多输入多输出结构。这也是课程后半段从 classical control 转向 modern state-space control 的原因。</p>
<div class="cs-practice"><strong>练习</strong><ol><li>解释 $G_{12}$ 的物理含义。</li><li>为什么 RGA 出现负元素时 pairing 要格外谨慎？</li><li>为什么接近奇异的 $G(0)$ 会让 decoupling 对模型误差很敏感？</li></ol></div>
<div class="cs-reading"><strong>对应阅读</strong>ETH 课程 MIMO / interaction / pairing 部分；Feedback Systems 的 MIMO state-space 与 robustness 相关内容。</div>`
},
{
id:'10',title:'Controllability 与 State Feedback',question:'如果所有状态都能测到，我们是否可以直接“安排”闭环极点？什么时候这种想法根本不可行？',
body:`<div class="cs-goals"><strong>学习目标</strong><ul><li>理解 controllability 的结构意义。</li><li>会构造 controllability matrix。</li><li>理解 state feedback pole placement。</li><li>知道极点不能任意放得“越快越好”。</li></ul></div>
<h2 id="statefeedback">1. State feedback</h2><p>线性系统 $\\dot x=Ax+Bu$，若采用</p><p class="cs-equation">$$u=-Kx+Nr,$$</p><p>闭环矩阵变成 $A-BK$。因此设计 $K$ 的核心是让 $A-BK$ 具有想要的 eigenvalues。</p>
<h2 id="ctrl">2. Controllability</h2><p>controllability matrix：</p><p class="cs-equation">$$\\mathcal C=[B\;AB\;A^2B\;\\cdots\;A^{n-1}B].$$</p><p>如果 $\\mathrm{rank}(\\mathcal C)=n$，系统完全可控。含义是：通过合适输入，在有限时间内可以把状态从任意初始点驱动到任意目标点。</p><p>如果某个不稳定 mode 不可控，那么无论 controller 多聪明，都无法用输入影响那个 mode，因此不能稳定它。</p>
<h2 id="pbh">3. PBH test</h2><p>另一种判据：对每个 eigenvalue $\\lambda$，检查</p><p class="cs-equation">$$\\mathrm{rank}[\\lambda I-A\;B]=n.$$</p><p>PBH test 更直接地告诉你哪个 eigenmode 不可控。</p>
<h2 id="placement">4. Pole placement</h2><p>若 $(A,B)$ controllable，则 SISO 情况下可以任意指定闭环 characteristic polynomial，从而求 $K$。Ackermann formula 给出一个显式构造，但高阶系统数值上不宜直接使用。</p><div class="cs-example"><span class="cs-label">Worked example</span><strong>二阶系统的 state feedback</strong><p>令</p><p class="cs-equation">$$A=\\begin{bmatrix}0&1\\\\0&0\\end{bmatrix},\quad B=\\begin{bmatrix}0\\\\1\\end{bmatrix},\quad K=[k_1\;k_2].$$</p><p>则</p><p class="cs-equation">$$A-BK=\\begin{bmatrix}0&1\\\\-k_1&-k_2\\end{bmatrix}$$</p><p>characteristic polynomial 为 $s^2+k_2s+k_1$。若 desired poles 是 $-2,-3$，目标 polynomial 是 $s^2+5s+6$，所以 $k_2=5,k_1=6$。</p></div>
<h2 id="limits">5. 为什么 pole 不能无限往左放</h2><ul><li>需要更大 control effort。</li><li>放大 measurement noise。</li><li>更容易激发未建模高速 dynamics。</li><li>离散采样、delay 和 actuator bandwidth 会成为硬限制。</li></ul><p>pole placement 给你“结构上能做到什么”，不是告诉你“工程上应该做到多快”。</p>
<h2 id="integral">6. Integral augmentation</h2><p>state feedback 本身并不自动保证 reference step 零稳态误差。可把 error integral 加为额外状态 $\\dot z=r-y$，然后对 augmented state $[x^T,z]^T$ 做反馈设计。</p>
<div class="cs-practice"><strong>练习</strong><ol><li>计算上面 double integrator 的 controllability matrix。</li><li>若某个 RHP eigenvalue 对应不可控 mode，能否稳定系统？</li><li>为什么 state feedback 中仍然需要 integral augmentation 来保证 step tracking？</li></ol></div>
<div class="cs-reading"><strong>对应阅读</strong>Feedback Systems：State Feedback、Reachability/Controllability；ETH state-feedback 部分。</div>`
},
{
id:'11',title:'Observability、Observer 与 Separation',question:'如果控制律需要状态，但传感器只测到部分输出，怎样重建“看不见”的状态？',
body:`<div class="cs-goals"><strong>学习目标</strong><ul><li>理解 observability。</li><li>会构造 observability matrix。</li><li>推导 Luenberger observer error dynamics。</li><li>理解 separation principle。</li></ul></div>
<h2 id="obs">1. Observability</h2><p>系统</p><p class="cs-equation">$$\\dot x=Ax+Bu,\qquad y=Cx.$$</p><p>若从已知输入 $u(t)$ 和输出 $y(t)$ 的有限时间历史可以唯一恢复初始状态，那么系统 observable。</p><p>observability matrix：</p><p class="cs-equation">$$\\mathcal O=\\begin{bmatrix}C\\\\CA\\\\CA^2\\\\\\vdots\\\\CA^{n-1}\\end{bmatrix}.$$</p><p>$\\mathrm{rank}(\\mathcal O)=n$ 表示完全可观。</p>
<h2 id="observer">2. Luenberger observer</h2><p>复制一份模型，再用 output prediction error 修正：</p><p class="cs-equation">$$\\dot{\\hat x}=A\\hat x+Bu+L(y-C\\hat x).$$</p><p>定义 estimation error $e=x-\\hat x$，得到</p><p class="cs-equation">$$\\dot e=(A-LC)e.$$</p><p>因此 observer gain $L$ 的设计和 state-feedback gain $K$ 十分相似：我们安排 $A-LC$ 的 eigenvalues。</p>
<h2 id="dual">3. 对偶性</h2><p>$(A,C)$ observable 等价于 $(A^T,C^T)$ controllable。于是许多 state-feedback pole-placement 方法可以直接对转置系统使用来设计 observer。</p>
<h2 id="speed">4. Observer poles 放多快？</h2><p>observer 需要比 controller 相关 dynamics 更快，才能尽快消除初始估计误差；但太快意味着 $L$ 很大，会强烈放大 measurement noise 和 model mismatch。因此“5–10 倍更快”只是粗略经验，不是普适规则。</p>
<div class="cs-example"><span class="cs-label">Worked example</span><strong>二阶 observer</strong><p>若 $A=\\begin{bmatrix}0&1\\\\0&0\\end{bmatrix}$，$C=[1\;0]$，令 $L=[l_1\;l_2]^T$，则</p><p class="cs-equation">$$A-LC=\\begin{bmatrix}-l_1&1\\\\-l_2&0\\end{bmatrix}.$$</p><p>characteristic polynomial 是 $s^2+l_1s+l_2$。若 observer poles 选在 $-5,-6$，则 $l_1=11,l_2=30$。</p></div>
<h2 id="separation">5. Separation principle</h2><p>用估计状态做控制：</p><p class="cs-equation">$$u=-K\\hat x.$$</p><p>在标准 LTI 条件下，closed-loop eigenvalues 是 controller poles（$A-BK$）和 observer poles（$A-LC$）的并集。因此可以先独立设计 $K$，再设计 $L$。</p><p>但 separation principle 并不意味着 robustness 也自动分离；实际系统仍需同时检查 noise、saturation、model uncertainty。</p>
<div class="cs-practice"><strong>练习</strong><ol><li>计算 double integrator、position-only measurement 的 observability matrix。</li><li>从 observer 方程推导 $\\dot e=(A-LC)e$。</li><li>为什么 observer poles 太快会放大 noise？</li></ol></div>
<div class="cs-reading"><strong>对应阅读</strong>Feedback Systems：Output Feedback、Observability、Observers。</div>`
},
{
id:'12',title:'LQR、Kalman Filter 与 LQG',question:'如果不想“手工猜极点”，能否从性能代价与噪声模型直接推导控制器和估计器？',
body:`<div class="cs-goals"><strong>学习目标</strong><ul><li>理解 LQR cost function 与 Riccati equation。</li><li>理解 $Q,R$ 如何表达性能权衡。</li><li>理解 Kalman filter 的随机估计思想。</li><li>理解 LQG = LQR + Kalman filter，以及它并不自动保证鲁棒性。</li></ul></div>
<h2 id="lqr">1. LQR：把“快”和“省控制力”写成一个优化问题</h2><p>系统 $\\dot x=Ax+Bu$，定义无限时域 quadratic cost：</p><p class="cs-equation">$$J=\\int_0^\\infty(x^TQx+u^TRu)dt,$$</p><p>其中 $Q\\succeq0,R\\succ0$。LQR 最优控制律是</p><p class="cs-equation">$$u=-Kx,\qquad K=R^{-1}B^TP,$$</p><p>$P$ 满足 algebraic Riccati equation：</p><p class="cs-equation">$$A^TP+PA-PBR^{-1}B^TP+Q=0.$$</p>
<h2 id="weights">2. Q 和 R 不是“神秘调参”</h2><p>$Q$ 大意味着更讨厌 state deviation，倾向于更积极控制；$R$ 大意味着更讨厌 control effort，控制会更温和。</p><p>实际常用 Bryson's rule：若允许状态最大尺度约 $x_{i,max}$，可先取 $Q_{ii}\\sim1/x_{i,max}^2$；输入同理取 $R_{jj}\\sim1/u_{j,max}^2$。这只是初始化，再结合响应调节。</p>
<div class="cs-example"><span class="cs-label">Interpretation</span><strong>LQR 和 pole placement 的区别</strong><p>pole placement 直接指定 eigenvalues；LQR 指定“什么状态偏差贵、什么控制动作贵”，由优化自动产生 closed-loop poles。它通常更容易得到平衡、数值良好的 MIMO feedback gain。</p></div>
<h2 id="kalman">3. Kalman filter：用统计模型做最优状态估计</h2><p>考虑</p><p class="cs-equation">$$\\dot x=Ax+Bu+w,\qquad y=Cx+v,$$</p><p>其中 process noise $w$ 协方差 $W$，measurement noise $v$ 协方差 $V$。Kalman filter 的结构与 Luenberger observer 相同：</p><p class="cs-equation">$$\\dot{\\hat x}=A\\hat x+Bu+L(y-C\\hat x),$$</p><p>但 gain $L$ 不再靠手工选 poles，而是由 estimation error covariance 的 Riccati equation 导出。直觉：</p><ul><li>$W$ 大：更不信模型 → 更依赖 measurement → Kalman gain 增大。</li><li>$V$ 大：更不信 sensor → 更依赖 model → gain 减小。</li></ul>
<h2 id="lqg">4. LQG：LQR + Kalman filter</h2><p>把 LQR state feedback $u=-Kx$ 中的真实状态换成 Kalman estimate：</p><p class="cs-equation">$$u=-K\\hat x.$$</p><p>在线性高斯假设下，这构成 LQG controller，并满足 separation principle。</p>
<h2 id="robust">5. 最优不等于鲁棒</h2><p>LQR/LQG 的“optimal”只针对你写下来的模型、cost、noise statistics。模型错得厉害时，理论最优可能并不鲁棒。尤其 LQG 的 robustness 不应想当然，需要回到 loop transfer、margins、uncertainty 做验证。</p>
<h2 id="summary">6. 全课程地图</h2><div class="cs-table-wrap"><table class="cs-table"><thead><tr><th>问题</th><th>工具</th></tr></thead><tbody><tr><td>系统怎么动？</td><td>model / state / transfer function</td></tr><tr><td>闭环会不会稳定？</td><td>poles / Routh / Nyquist</td></tr><tr><td>怎样设计 SISO controller？</td><td>PID / root locus / loop shaping</td></tr><tr><td>多个 I/O 怎么办？</td><td>MIMO / RGA / state space</td></tr><tr><td>状态能否被控制？</td><td>controllability / state feedback</td></tr><tr><td>状态看不到怎么办？</td><td>observability / observer / Kalman</td></tr><tr><td>怎样系统化权衡性能？</td><td>LQR / LQG</td></tr></tbody></table></div>
<div class="cs-practice"><strong>练习</strong><ol><li>如果把 $R$ 放大 100 倍，LQR 通常会变得更激进还是更保守？</li><li>measurement noise covariance $V$ 增大时，Kalman gain 一般怎样变化？</li><li>为什么 LQG 即使在随机意义下 optimal，也仍要检查 gain/phase margins？</li></ol><details><summary>答案提示</summary><p>1：更保守；2：通常减小；3：optimal 是相对于给定模型与统计假设，不等于面对模型不确定性仍有足够稳定裕度。</p></details></div>
<div class="cs-reading"><strong>对应阅读</strong>Feedback Systems：Optimal Control、State Estimation；ETH 后半段 LQR / optimal estimation 内容。</div>`
}
];

const refs=`<div class="cs-ref"><strong>资料说明</strong><p>本课程按 ETH 227-0103-00L 的公开课程范围组织，并参考 ETH 历年公开 lecture videos 与 Åström–Murray <em>Feedback Systems</em> 的开放教材内容重新讲解。当前未读取登录后的 Moodle slides / exercise sheets；如果提供本学期 PDF，可继续逐讲校准符号、顺序、例题和考试重点。</p></div>`;

function renderCourseUnit(){
  const root=document.querySelector('[data-unit]');
  if(!root) return;
  const id=root.dataset.unit;
  const index=courseUnits.findIndex(u=>u.id===id);
  const unit=courseUnits[index];
  if(!unit) return;
  document.title=`${unit.id} · ${unit.title} | ETH Control Systems`;
  const temp=document.createElement('div'); temp.innerHTML=unit.body;
  const toc=[...temp.querySelectorAll('h2')].map(h=>({id:h.id,label:h.textContent.replace(/^\\d+\\.\\s*/, '')}));
  const tocNode=document.getElementById('unitToc');
  tocNode.innerHTML=`<p class="cs-toc-label">Unit ${unit.id}</p>${toc.map(t=>`<a href="#${t.id}">${t.label}</a>`).join('')}`;
  document.getElementById('unitArticle').innerHTML=`<div class="cs-eyebrow">ETH 227-0103-00L · Unit ${unit.id} / ${courseUnits.length}</div><h1>${unit.title}</h1><p class="cs-question">${unit.question}</p>${unit.body}${refs}<nav class="cs-pager">${index>0?`<a href="./unit${courseUnits[index-1].id}.html">← ${courseUnits[index-1].title}</a>`:'<a href="./">← 返回课程目录</a>'}${index<courseUnits.length-1?`<a href="./unit${courseUnits[index+1].id}.html">${courseUnits[index+1].title} →</a>`:'<a href="./">完成 · 返回目录 →</a>'}</nav>`;
  if(window.renderMathInElement){renderMathInElement(document.getElementById('unitArticle'),{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});}
}
document.addEventListener('DOMContentLoaded',renderCourseUnit);