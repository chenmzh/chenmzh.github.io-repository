(function(){
  const P=window.practiceEnhancements;
  if(!P)return;
  P.worked=P.worked||{};
  P.labs=P.labs||{};

  P.worked['01-1']=String.raw`<div class="cs-worked"><span class="cs-label">Worked example · 读系统</span><h3>Rocket attitude：先不写方程，只把闭环角色找全</h3><p>假设一枚火箭希望保持 pitch angle $\theta$ 接近 reference $\theta_r$。IMU 能测角度/角速度，engine gimbal 可以改变 thrust direction。</p><ol class="cs-solution-steps"><li><strong>Reference：</strong>$\theta_r$，例如希望机体保持 0° pitch error。</li><li><strong>Measurement：</strong>IMU 提供的 $\theta_m,\dot\theta_m$。注意 measurement 不一定等于真实 state，里面有 noise/bias。</li><li><strong>Controller：</strong>根据 attitude error 和 angular-rate information 算 gimbal command。</li><li><strong>Actuator：</strong>servo/gimbal mechanism 把数字 command 变成 nozzle angle，再产生 torque。</li><li><strong>Plant：</strong>rocket rigid-body rotational dynamics。</li><li><strong>Disturbance：</strong>aerodynamic torque、mass/fuel distribution 变化、wind gust。</li></ol><div class="cs-plain-language"><span class="cs-label">为什么这是 feedback</span><p>controller 不需要提前知道下一阵风多大。风先让 attitude 偏掉，IMU 看见偏差，controller 再改变 gimbal 把姿态拉回来。真正让系统鲁棒的是“现实变化以后仍会再测一次”。</p></div><div class="cs-mistake"><strong>常见错误</strong><p>把 “gimbal command” 和 “control torque” 当成同一个量。前者是 controller 输出，后者要经过 actuator + thrust physics 才真正作用到 plant。</p></div><p class="cs-origin">题型来源：ETH L01 slides 中的 rocket / feedback motivation；本站问题与讲解为独立重写。</p></div>`;

  P.worked['01-2']=String.raw`<div class="cs-worked"><span class="cs-label">Worked example · Feedforward</span><h3>已知坡度时，为什么可以在速度掉下来之前先补油门？</h3><p>仍用</p><p class="cs-equation">$$m\dot v=k_tu-bv+d.$$</p><p>假设目标 constant speed $r=25$ m/s，$b=120$ N·s/m，$k_t=6000$ N。平路需要 $u=0.5$。</p><p>现在导航/坡度传感器提前告诉你即将出现约 $600$ N 的额外阻力，也就是 $d=-600$ N。要让 equilibrium 仍然是 $v=r$：</p><p class="cs-equation">$$0=6000u-120(25)-600.$$</p><p>所以</p><p class="cs-equation">$$u=\frac{3000+600}{6000}=0.6.$$</p><p>如果提前把 command 从 0.5 提到 0.6，理想模型里车速甚至不必先产生 error。这就是 disturbance feedforward 的优势。</p><div class="cs-mistake"><strong>但为什么还要 feedback？</strong><p>因为真实坡度、vehicle mass、drag、actuator gain 都不会精确等于模型值。0.6 只是 nominal answer；feedback 用来清掉剩下的 mismatch。</p></div></div>`;

  P.worked['01-3']=String.raw`<div class="cs-worked"><span class="cs-label">Worked example · Feedback algebra</span><h3>模型增益错 10%，feedback 能把误差压到什么量级？</h3><p>假设真实 static plant 是 $G=11$，但你原来以为它是 10。纯 feedforward 用 $u=r/10$：</p><p class="cs-equation">$$y=11\frac r{10}=1.1r,$$</p><p>所以 tracking error 是 10%。</p><p>现在改用 proportional feedback $u=K(r-y)$，取 $K=100$。闭环 reference gain：</p><p class="cs-equation">$$\frac{GK}{1+GK}=\frac{1100}{1101}\approx0.99909.$$</p><p>因此 reference-to-output 的 gain error 只剩约</p><p class="cs-equation">$$1-0.99909\approx9.1\times10^{-4},$$</p><p>也就是约 0.091%。</p><ol class="cs-solution-steps"><li>open loop：model error 直接进入 output。</li><li>feedback：model error 仍然存在，但 closed-loop gain 被 $1+GK$ 的 denominator “钝化”。</li><li>这不是说模型不重要；当 frequency 提高、delay/RHP dynamics 出现时，$GK$ 不能随便做得巨大。</li></ol><p class="cs-origin">对应 ETH L01 cruise-control board derivation 的能力目标；本站数值与解法为独立重写。</p></div>`;

  P.worked['01-5']=String.raw`<div class="cs-worked"><span class="cs-label">Worked example · 2-DOF</span><h3>为什么机器人手臂通常同时需要 trajectory feedforward 和 feedback？</h3><p>假设 planner 已经给出希望的 joint position $q_r(t)$、velocity $\dot q_r(t)$、acceleration $\ddot q_r(t)$。如果你有 nominal dynamics model，就可以用这些量先算大部分 torque：</p><p class="cs-equation">$$\tau_{ff}\approx M(q_r)\ddot q_r+C(q_r,\dot q_r)\dot q_r+g(q_r).$$</p><p>但真实 robot 有 payload mismatch、friction、gear elasticity，于是再加</p><p class="cs-equation">$$\tau_{fb}=K_p(q_r-q)+K_d(\dot q_r-\dot q).$$</p><p>总 torque command：</p><p class="cs-equation">$$\tau=\tau_{ff}+\tau_{fb}.$$</p><p>前馈负责“根据已知 trajectory 提前出力”，反馈负责“实际没有按模型走时纠正”。这正是 2-DOF 的工程直觉。</p></div>`;

  P.labs['01']=String.raw`<section class="cs-lab"><span class="cs-label">Python mini-lab · L01</span><h2>亲手看到：未知上坡对 open loop 和 feedback 有什么不同</h2><p>我们不用 control toolbox，只用 Euler integration 模拟最简单的 cruise model。先运行默认参数，再只改 <code>kp</code>、<code>disturbance</code>、<code>b_real</code> 三个值。</p><pre><code>import numpy as np
import matplotlib.pyplot as plt

# plant
m = 1500.0       # kg
b_real = 120.0   # N s/m
kt = 6000.0      # N per command unit
r = 25.0         # m/s

# nominal feedforward model
b_nom = 120.0
u_ff = b_nom * r / kt

# feedback gain
kp = 0.05        # command / (m/s)

# simulation
dt = 0.01
T = 35.0
t = np.arange(0, T + dt, dt)
v_ol = np.zeros_like(t)
v_cl = np.zeros_like(t)
v_ol[0] = r
v_cl[0] = r

for k in range(len(t) - 1):
    # unknown hill starts at t = 8 s
    disturbance = -600.0 if t[k] >= 8.0 else 0.0

    # open loop: keep using the old nominal feedforward
    u_ol = u_ff

    # feedback: nominal feedforward + correction from measured speed
    e = r - v_cl[k]
    u_cl = u_ff + kp * e

    # optional actuator limit
    u_ol = np.clip(u_ol, 0.0, 1.0)
    u_cl = np.clip(u_cl, 0.0, 1.0)

    dv_ol = (kt * u_ol - b_real * v_ol[k] + disturbance) / m
    dv_cl = (kt * u_cl - b_real * v_cl[k] + disturbance) / m

    v_ol[k+1] = v_ol[k] + dt * dv_ol
    v_cl[k+1] = v_cl[k] + dt * dv_cl

plt.figure()
plt.plot(t, v_ol, label='open loop')
plt.plot(t, v_cl, label='feedback')
plt.axhline(r, linestyle='--', label='reference')
plt.xlabel('time [s]')
plt.ylabel('speed [m/s]')
plt.legend()
plt.show()</code></pre><div class="cs-lab-read"><strong>运行后按顺序看 4 件事</strong><ol><li>8 秒前两条曲线为什么都能保持 25 m/s？</li><li>上坡以后 open loop 为什么会慢慢掉到约 20 m/s？</li><li>feedback 为什么最终仍有一点误差，而不是精确回到 25？</li><li>把 <code>kp</code> 改成 0.10：误差和恢复速度怎样变化？然后把 actuator limit 改成 0.55，为什么 high gain 的优势会突然消失一部分？</li></ol><p>最后把 <code>b_real</code> 改成 140、但保留 <code>b_nom=120</code>。这就是最简单的 model uncertainty experiment。</p></div></section>`;
})();