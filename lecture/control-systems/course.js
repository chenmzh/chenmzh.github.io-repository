const courseUnits = [
  {
    id:'01', title:'为什么控制问题从模型开始？', question:'在设计控制器以前，我们究竟需要知道被控对象的哪些信息？',
    body:`<h2 id="problem">1. 控制不是“调参数”，而是改变动力学</h2><p>控制系统关心的是一个会随时间演化的对象。最基本的连续时间模型可以写成 <span class="cs-equation">$\\dot x=f(x,u),\\; y=h(x,u)$</span>：$x$ 是状态，$u$ 是我们能施加的输入，$y$ 是传感器真正量到的输出。状态不是“所有物理量”，而是足够预测未来演化的最小信息。</p><div class="cs-callout"><strong>先建立三个问题。</strong><br>系统现在在哪里？——状态。<br>我们能改变什么？——输入。<br>我们真正关心/测到什么？——输出。</div><h2 id="equilibrium">2. 平衡点为什么重要</h2><p>多数线性控制器都不是在整个非线性世界里保证同样性能，而是在某个工作点附近设计。若存在 $x^*,u^*$ 使 $f(x^*,u^*)=0$，它就是平衡点。把偏差定义为 $\\delta x=x-x^*$、$\\delta u=u-u^*$，在工作点一阶展开得到</p><p class="cs-equation">$$\\delta\\dot x=A\\delta x+B\\delta u,\\qquad \\delta y=C\\delta x+D\\delta u.$$</p><p>这里的 Jacobian 矩阵 $A,B,C,D$ 把非线性对象局部变成 LTI 模型。真正要记住的不是线性化公式，而是它的边界：离工作点越远，高阶项越不能忽略。</p><h2 id="example">3. 例子：水箱</h2><p>设水位为 $h$，泵流量为 $q_{in}$，出流近似 $q_{out}=k\\sqrt h$。面积为 $A_t$ 时，$A_t\\dot h=q_{in}-k\\sqrt h$。在平衡点 $q_{in}^*=k\\sqrt{h^*}$ 周围线性化后，水位偏差服从一阶系统。于是原本带平方根的过程，局部变成一个可直接讨论时间常数、稳定性和反馈增益的问题。</p><h2 id="takeaway">4. 这一课真正建立的直觉</h2><p>控制设计的第一步不是选 PID，而是决定“什么模型足够表达你要解决的问题”。模型太粗，控制器会忽略关键约束；模型太复杂，又会让设计和辨识成本失控。</p><div class="cs-check"><strong>理解检查</strong>为什么线性模型常常很有用，却不能自动保证全局安全？试着用“工作点”和“高阶项”回答。</div>`
  },
  {
    id:'02', title:'同一个系统，为什么要换一种表示？', question:'状态空间已经能描述系统，为什么经典控制还如此依赖传递函数、极点和零点？',
    body:`<h2 id="laplace">1. 从微分方程到代数关系</h2><p>对零初值 LTI 系统做 Laplace 变换，微分运算变成乘以 $s$。于是输入输出关系可写成 $Y(s)=G(s)U(s)$，其中</p><p class="cs-equation">$$G(s)=C(sI-A)^{-1}B+D.$$</p><p>传递函数把内部状态暂时隐藏起来，只保留输入到输出的映射。这正适合 SISO 闭环设计：我们关心的往往是参考输入、扰动和测量噪声如何传到输出。</p><h2 id="poles">2. 极点决定“自然怎么动”</h2><p>若 $G(s)=N(s)/D(s)$，$D(s)=0$ 的根是极点。稳定的一阶系统 $1/(\\tau s+1)$ 的极点在 $-1/\\tau$，时间常数 $\\tau$ 越小，响应越快。二阶标准型</p><p class="cs-equation">$$G(s)=\\frac{\\omega_n^2}{s^2+2\\zeta\\omega_n s+\\omega_n^2}$$</p><p>用自然频率 $\\omega_n$ 和阻尼比 $\\zeta$ 把“快”和“振”分开：$\\omega_n$ 控制时间尺度，$\\zeta$ 决定超调与振荡程度。</p><h2 id="zeros">3. 零点不是装饰</h2><p>零点会改变瞬态和相位。特别是右半平面零点对应 non-minimum-phase 行为：系统可能先朝目标相反方向动一下，再走向目标。这样的对象即使稳定，也对快速跟踪设置了硬限制。</p><h2 id="extra">4. 多一个极点/零点什么时候可以忽略</h2><p>若额外极点的速度远高于主导极点，它对主要时间尺度的影响可能很小；若它靠近闭环带宽，就不能简单删掉。所谓“模型降阶”本质上是在判断哪些动力学进入了设计频段。</p><div class="cs-check"><strong>理解检查</strong>一个系统所有极点都在左半平面，是否就意味着“响应一定好”？为什么稳定性和性能必须分开讨论？</div>`
  },
  {
    id:'03', title:'反馈究竟改变了什么？', question:'为什么把输出接回输入端，会同时改善跟踪、抑制扰动，却又可能把系统推向不稳定？',
    body:`<h2 id="loop">1. 最小负反馈环</h2><p>设 plant 为 $P(s)$、controller 为 $C(s)$，环路传递函数 $L(s)=P(s)C(s)$。单位负反馈下，参考到输出为</p><p class="cs-equation">$$T(s)=\\frac{L(s)}{1+L(s)},\\qquad S(s)=\\frac{1}{1+L(s)}.$$</p><p>$S$ 是 sensitivity，$T$ 是 complementary sensitivity，并且 $S+T=1$。这一个恒等式已经告诉我们：你无法在所有频率上同时把二者都压到零。</p><h2 id="disturbance">2. 跟踪、扰动和噪声其实是不同通道</h2><p>低频处希望 $|L|$ 大，于是 $|S|$ 小：常值参考更容易跟上，慢扰动更容易被压制。高频处却通常希望 $|L|$ 小，这样测量噪声不会通过 $T$ 被放大，同时也避免去驱动未建模的高速动力学。</p><h2 id="error">3. 稳态误差为什么和积分有关</h2><p>若环路在 $s=0$ 处有积分器，则 DC 增益趋于无穷，理想情况下对阶跃参考有 $S(0)=0$，因此稳态误差为零。但积分器也增加相位滞后，会压缩稳定裕度。反馈的核心从来不是“误差越小越好”，而是权衡。</p><h2 id="robust">4. 反馈为什么能对模型误差不敏感</h2><p>当环路增益足够大时，闭环输出对 plant 参数变化的相对敏感度通常被 $S$ 缩小。这也是 feedback 最有价值的地方之一：不是让模型变准，而是让性能对模型不准更不敏感。</p><div class="cs-check"><strong>理解检查</strong>为什么“把控制器增益一直加大”不是通用答案？至少从噪声、未建模高频动力学和稳定裕度三个角度回答。</div>`
  },
  {
    id:'04', title:'PID 为什么如此常用？', question:'只用误差的现在、过去和变化趋势，为什么就能覆盖大量工业控制问题？',
    body:`<h2 id="pid">1. 三个动作分别在做什么</h2><p>理想 PID 为</p><p class="cs-equation">$$u(t)=K_p e(t)+K_i\\int e(t)dt+K_d\\frac{de}{dt}.$$</p><p>比例项对“现在的误差”反应；积分项记住长期偏差，负责消除稳态误差；微分项预测误差变化趋势，常用于增加阻尼。频域里三者分别对应常数、$1/s$ 与 $s$ 的塑形作用。</p><h2 id="pi">2. 为什么工程里 PI 比纯 PID 更常见</h2><p>微分会放大高频测量噪声，因此实际实现通常不是理想 $K_ds$，而是带 roll-off 的 filtered derivative。很多过程控制对象速度较慢，PI 已足够解决跟踪与扰动抑制。</p><h2 id="zn">3. Ziegler–Nichols 是起点，不是答案</h2><p>经典整定法通过临界增益/振荡周期或阶跃响应来给出初始参数。它的价值是快速得到可用起点；缺点是可能带来较大超调和偏激进的闭环。真正设计仍要回到目标：允许多少超调、带宽多大、执行器能否承受。</p><h2 id="windup">4. 积分 windup 为什么会发生</h2><p>执行器饱和时，真实输入已经无法继续增加，但积分器还在累积误差。等系统终于回到可控区间，积分状态仍很大，于是产生严重超调。anti-windup 的核心是让控制器内部状态知道“执行器实际上没有做到你要求的输入”。</p><div class="cs-callout"><strong>设计顺序。</strong>先用 P 建立响应速度，再用 I 消除低频偏差，最后只有在确实需要额外阻尼/相位提前时再引入 D，并显式处理噪声与饱和。</div><div class="cs-check"><strong>理解检查</strong>积分项为什么既能改善稳态误差，又会让闭环更难稳定？</div>`
  },
  {
    id:'05', title:'怎样判断闭环会不会发散？', question:'不画仿真曲线，能否仅从特征方程判断闭环稳定，并看出增益变化会把极点推向哪里？',
    body:`<h2 id="characteristic">1. 闭环稳定性藏在 $1+L(s)=0$</h2><p>闭环极点是特征方程 $1+L(s)=0$ 的根。连续时间 LTI 系统若所有闭环极点严格位于左半平面，则内部状态会指数衰减；任何极点进入右半平面都会产生发散模态。</p><h2 id="routh">2. Routh–Hurwitz：不显式求根也能数右半平面极点</h2><p>对多项式特征方程构造 Routh 表，通过首列符号变化可判断右半平面根的数量。它特别适合把“哪些控制器参数保持稳定”变成代数不等式。</p><h2 id="rootlocus">3. 根轨迹：把增益当作旋钮</h2><p>若 $L(s)=K L_0(s)$，root locus 描述 $K$ 从 0 到无穷时闭环极点如何移动。轨迹从开环极点出发，最终走向开环零点或无穷远。它把“增益增加会更快吗？”变成可视几何问题：某些极点确实向左走，但也可能有分支穿过虚轴进入不稳定区域。</p><h2 id="performance">4. 稳定不是终点</h2><p>极点很靠近虚轴，系统虽然稳定，却可能响应极慢或高度振荡；极点太靠左又可能要求极大控制输入并激发高频未建模动力学。因此根轨迹真正有用之处是同时讨论稳定、速度、阻尼和控制代价。</p><div class="cs-check"><strong>理解检查</strong>为什么“闭环稳定”只是一条最低门槛，而不是设计目标本身？</div>`
  },
  {
    id:'06', title:'为什么频率响应能指导设计？', question:'时间域里看起来复杂的闭环，为什么换成正弦输入后会暴露出稳定裕度和性能边界？',
    body:`<h2 id="bode">1. Bode 图是在问：每个频率被放大多少、拖后多少</h2><p>对稳定 LTI 系统，给定频率 $\\omega$ 的正弦输入，稳态输出仍是同频正弦，只改变幅值和相位。Bode magnitude 画 $|G(j\\omega)|$，phase 画 $\\angle G(j\\omega)$。极点通常带来负斜率和相位滞后，零点则可能提供相反效果。</p><h2 id="margin">2. 增益裕度和相位裕度在量什么</h2><p>反馈真正危险的是环路在幅值接近 1 时，相位又接近 $-180^\\circ$。phase margin 衡量单位增益交越处离 $-180^\\circ$ 还有多远；gain margin 衡量相位达到 $-180^\\circ$ 时还允许放大多少。这些不是完美的鲁棒性指标，但为 SISO 设计提供非常直观的安全余量。</p><h2 id="nyquist">3. Nyquist 判据把“频率轨迹”与右半平面极点连接起来</h2><p>Nyquist contour 经 $L(s)$ 映射后，对 $-1$ 点的环绕次数与开环/闭环右半平面极点数存在精确关系。它允许处理存在不稳定开环极点的系统，而不只是看 Bode margin。</p><h2 id="bandwidth">4. 带宽是速度的频域影子</h2><p>闭环带宽越高，通常能跟踪更快变化的参考、获得更快时间响应；但高带宽也会更容易放大噪声、驱动执行器，并暴露未建模高频动力学。因此“更快”永远不是免费午餐。</p><div class="cs-check"><strong>理解检查</strong>为什么设计者会特别关心 0 dB 交越附近的相位，而不是只看低频增益？</div>`
  },
  {
    id:'07', title:'Loop shaping 到底在“塑”什么？', question:'如果目标不是“画一条漂亮 Bode 线”，那我们究竟在安排哪些闭环能力？',
    body:`<h2 id="targets">1. 先写闭环目标，再塑造开环</h2><p>Loop shaping 常用的思路是反过来设计 $L=PC$：低频做大以压低 $S=1/(1+L)$，中频安排交越与相位裕度，高频做小以压低 $T=L/(1+L)$ 和控制器对噪声的响应。</p><h2 id="tradeoff">2. $S+T=1$ 是最基本的冲突</h2><p>低频跟踪/扰动抑制要求 $S$ 小；高频测量噪声抑制要求 $T$ 小。二者不可能在同一频率都任意小。真实设计是在不同频段分工，而不是寻找“全频完美控制器”。</p><h2 id="leadlag">3. lead/lag compensation 为什么有效</h2><p>lag 网络更偏向提高低频增益而不过多改变高频；lead 网络在交越附近提供正相位，常用于增加 phase margin 或提高带宽。它们的工程意义比电路形式更重要：在需要的频段有针对性地重分配增益和相位。</p><h2 id="robustness">4. 鲁棒性其实在问未建模误差会不会闭环放大</h2><p>若模型高频处不可靠，而控制器仍保持很大增益，闭环就会把自己暴露给未知动力学。一个常见经验是让交越频率低于明显未建模共振，并保证足够 roll-off。robust design 的第一层不是复杂算法，而是尊重模型有效频段。</p><div class="cs-callout"><strong>读 Bode 图时同时看三件事：</strong>低频能否把误差压下去？交越处有没有足够相位？高频是否足够快地衰减？</div><div class="cs-check"><strong>理解检查</strong>如果你把低频性能做得非常激进，为什么 sensitivity 往往必须在别的频率“鼓起来”？</div>`
  },
  {
    id:'08', title:'一个反馈环不够时怎么办？', question:'实际系统为什么常常需要前馈、cascade、两自由度和 anti-windup，而不是只调一个 feedback controller？',
    body:`<h2 id="feedforward">1. 前馈与反馈解决的问题不同</h2><p>feedback 看到误差以后再纠正，优势是对未知扰动和模型误差有适应性；feedforward 根据参考或可测扰动提前动作，优势是快。若模型足够准确，二者结合通常比单独反馈更好。</p><h2 id="2dof">2. 两自由度：把跟踪和扰动抑制分开调</h2><p>只用一个 controller 时，参考跟踪和反馈鲁棒性紧密耦合。2-DOF 架构通过 reference filter 或独立前馈通道，让 set-point response 能单独整形，而不牺牲反馈环对扰动的稳定性设计。</p><h2 id="cascade">3. Cascade：让快内环替外环处理局部麻烦</h2><p>若系统存在明显快慢层次，可先设计快内环稳定局部变量，再让慢外环看到一个更简单、更可控的等效对象。电机电流—速度—位置控制就是典型例子。</p><h2 id="imc">4. IMC 的思路：把模型显式放进控制结构</h2><p>Internal Model Control 用内部模型预测 plant 响应，再用真实输出与预测输出的差别估计模型误差/扰动。它与经典反馈可相互转换，但提供了很清晰的设计直觉：模型的可逆部分用于跟踪，不确定部分通过滤波保留鲁棒裕度。</p><h2 id="saturation">5. 饱和不是小细节</h2><p>执行器幅值和速率限制会破坏线性闭环假设。anti-windup、reference governor 或显式约束设计，本质上都在承认“控制命令并不等于实际执行输入”。</p><div class="cs-check"><strong>理解检查</strong>什么时候你更愿意加一个前馈通道，而不是继续提高反馈增益？</div>`
  },
  {
    id:'09', title:'多个输入输出为什么会互相“打架”？', question:'当一个执行器同时影响多个输出时，逐环调 SISO controller 为什么可能得到完全错误的结论？',
    body:`<h2 id="mimo">1. MIMO 的本质是耦合</h2><p>多变量系统可写成 $Y(s)=G(s)U(s)$，其中 $G$ 是传递矩阵。非对角元素说明某个输入会影响“别的”输出。若你独立关闭多个 SISO loop，这些环会通过 plant 相互作用。</p><h2 id="pairing">2. 输入输出 pairing 不是凭直觉</h2><p>Relative Gain Array 常用稳态增益矩阵 $G(0)$ 构造</p><p class="cs-equation">$$\\Lambda=G(0)\\circ G(0)^{-T},$$</p><p>其中 $\\circ$ 是逐元素乘积。$\\lambda_{ij}$ 近似衡量：当其他回路闭合后，输入 $u_j$ 对输出 $y_i$ 的有效增益相对单独开环时怎样变化。接近 1 的配对通常更自然，负值则常提示危险 interaction。</p><h2 id="decouple">3. Decoupling 是把 plant 变得“更像对角阵”</h2><p>若模型可信，可以设计静态或动态 decoupler，让每个新虚拟输入主要影响一个输出。代价是对模型误差更敏感，并可能引入高阶/非最小相位问题，因此不是所有耦合都值得完全消掉。</p><h2 id="state">4. 状态空间为何在 MIMO 中重新变得自然</h2><p>SISO 中传递函数非常直观；MIMO 下，状态空间直接保留内部动力学、输入矩阵 $B$ 和输出矩阵 $C$，更容易讨论 controllability、observability 和多输入反馈。</p><div class="cs-check"><strong>理解检查</strong>为什么“某输入对某输出的开环增益最大”并不足以决定最佳 pairing？</div>`
  },
  {
    id:'10', title:'能直接安排闭环极点吗？', question:'如果我们能测到全部状态，是否可以直接规定闭环动力学应该长什么样？',
    body:`<h2 id="feedback">1. 状态反馈把矩阵 $A$ 改成 $A-BK$</h2><p>对 $\\dot x=Ax+Bu$，若采用 $u=-Kx$，闭环为</p><p class="cs-equation">$$\\dot x=(A-BK)x.$$</p><p>于是设计问题变成：选择 $K$，让 $A-BK$ 的特征值落到我们想要的位置。</p><h2 id="controllability">2. 可控性决定“你有没有权力移动这些模态”</h2><p>controllability matrix 为</p><p class="cs-equation">$$\\mathcal C=[B\\;AB\\;A^2B\\;\\cdots\\;A^{n-1}B].$$</p><p>若其秩为 $n$，系统完全可控；否则存在某些状态方向，无论怎么选择输入都无法独立操纵。不可控且不稳定的模态尤其致命，因为控制器没有办法把它拉回来。</p><h2 id="placement">3. Pole placement 很直接，但不是免费的</h2><p>对可控系统，可以选择 $K$ 把闭环极点放到指定位置。然而把极点放得极左往往意味着大增益和大控制输入，也会放大建模误差和噪声。数学上“能放”不等于工程上“应该放”。</p><h2 id="reference">4. 状态反馈还需要处理参考跟踪</h2><p>$u=-Kx$ 天生是 regulation：把状态拉回原点。跟踪非零参考通常要引入 prefilter、积分状态或对平衡点做坐标平移。理解这一点能避免把“稳定原点”误当成“自动跟踪任意 setpoint”。</p><div class="cs-check"><strong>理解检查</strong>一个系统可控，是否意味着可以毫无代价地实现任意快的闭环？为什么？</div>`
  },
  {
    id:'11', title:'看不到全部状态时怎么办？', question:'状态反馈需要 $x$，但现实里通常只有少量传感器输出 $y$；怎样从输入输出重建内部状态？',
    body:`<h2 id="observer">1. Observer 是一套运行中的模型</h2><p>Luenberger observer 写成</p><p class="cs-equation">$$\\dot{\\hat x}=A\\hat x+Bu+L(y-C\\hat x).$$</p><p>前两项用模型预测，最后一项用真实测量纠正预测。估计误差 $e=x-\\hat x$ 满足 $\\dot e=(A-LC)e$，因此 observer design 与 state feedback 有非常漂亮的对偶结构。</p><h2 id="observability">2. 可观性问的是“输出里有没有足够信息”</h2><p>observability matrix</p><p class="cs-equation">$$\\mathcal O=\\begin{bmatrix}C\\\\CA\\\\\\vdots\\\\CA^{n-1}\\end{bmatrix}$$</p><p>满秩时，理论上可以从一段输入输出历史唯一恢复初始状态。若某个不稳定模态完全不出现在测量里，就无法可靠估计它。</p><h2 id="separation">3. Separation principle 为什么重要</h2><p>对满足条件的 LTI 系统，可以先独立设计 state-feedback gain $K$，再独立设计 observer gain $L$，组合成 $u=-K\\hat x$。闭环极点由 controller poles 与 observer poles 合并构成。这个原则把一个复杂 output-feedback 问题拆成两个清晰问题。</p><h2 id="speed">4. Observer 不是越快越好</h2><p>把 observer poles 放得很快可以迅速消除初始估计误差，但也会更积极地追随测量噪声，并对模型误差更敏感。与控制器一样，估计器也有带宽与鲁棒性权衡。</p><div class="cs-check"><strong>理解检查</strong>为什么一个可控系统未必可观？这两个概念分别与 $B$、$C$ 的哪一侧有关？</div>`
  },
  {
    id:'12', title:'“最优控制”和“最优估计”如何相遇？', question:'不再手工指定极点，而是写下“状态偏差和控制能量有多贵”，能否让数学自动给出控制器？',
    body:`<h2 id="lqr">1. LQR 把设计偏好写进代价函数</h2><p>无限时域连续 LQR 最常见形式是</p><p class="cs-equation">$$J=\\int_0^\\infty (x^TQx+u^TRu)dt.$$</p><p>$Q\\succeq0$ 表示哪些状态偏差更昂贵，$R\\succ0$ 表示控制动作成本。最优控制具有 $u=-Kx$ 形式，$K=R^{-1}B^TP$，其中 $P$ 来自代数 Riccati 方程。</p><h2 id="meaning">2. “最优”只相对于你写下的模型和代价</h2><p>LQR 并不是自动知道工程目标。换一组 $Q,R$，最优解就会变。它的真正优势是把 pole placement 中隐含的“快一点还是省输入”变成显式权衡，并给出系统化求解。</p><h2 id="kalman">3. Kalman filter 是带噪声模型的最优状态估计</h2><p>若系统有过程噪声 $w$ 和测量噪声 $v$，并假设它们满足给定协方差，Kalman filter 用模型预测 + measurement innovation 更新估计。Kalman gain 不是手工放 observer poles，而是由噪声统计和 Riccati 方程决定。</p><h2 id="lqg">4. LQR + Kalman = LQG 的经典结构</h2><p>在标准假设下，可把 LQR controller 与 Kalman estimator 组合。separation principle 仍成立：控制最优性与估计最优性可以分开求解再组合。但要注意，LQG 的鲁棒裕度不等同于简单 LQR；模型不确定性仍需单独检查。</p><h2 id="arc">5. 回看整门课</h2><p>课程从“系统怎样动”开始，经过传递函数、反馈、PID、稳定性、Bode/Nyquist、loop shaping，再进入 MIMO 与状态空间，最后来到 optimal control/estimation。两条路线并不冲突：经典频域方法让鲁棒性和频段权衡非常直观；状态空间方法更适合多变量、内部状态和优化。</p><div class="cs-check"><strong>理解检查</strong>如果 Kalman filter 的测量噪声协方差被设得很大，你预计估计器会更相信传感器还是更相信模型？为什么？</div>`
  }
];

const refs = `<p class="cs-ref"><strong>公开参考：</strong>ETH Zürich 227-0103-00L <a href="https://people.ee.ethz.ch/~floriand/CSI.html" target="_blank" rel="noopener">course page</a> · <a href="https://www.vvz.ethz.ch/Vorlesungsverzeichnis/sucheLehrangebot.view?abschnittId=122815&ansicht=2&lang=en&seite=0&semkez=2026W" target="_blank" rel="noopener">Autumn 2026 catalogue</a> · Åström & Murray, <a href="https://fbsbook.org" target="_blank" rel="noopener">Feedback Systems</a>. 本站内容为独立重写的学习笔记，不复制 ETH Moodle 受限材料。</p>`;

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