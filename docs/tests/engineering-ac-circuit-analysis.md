# Electrical engineering regression: complex AC network

Use this prompt to check that ENOSX AI can carry out a multi-branch AC phasor analysis, distinguish real/reactive/apparent power, and verify Kirchhoff's current law and power balance.

The regression is especially sensitive to preserving the capacitor in branch A and the inductor in branch B; a solution that swaps those elements is incorrect even if it appears to satisfy a later arithmetic check.

## Test prompt

> An ideal sinusoidal source supplies 230 V RMS at 50 Hz with phase angle 0°. It feeds a 10 Ω series resistor and then a node with three parallel branches: (A) a 30 Ω resistor in series with a 100 µF capacitor; (B) a 20 Ω resistor in series with a 100 mH inductor; and (C) a 60 Ω resistor. Use RMS phasors and the passive sign convention. Calculate each branch impedance, the parallel equivalent, total impedance, source current, voltage across the parallel network, and all three branch currents, with magnitudes and phase angles. Then calculate the source real, reactive, and apparent power and power factor, identify leading/lagging behavior, and verify branch-current KCL and total power balance. Show equations and units, state assumptions, and round sensibly.

## Reference results

At \(\omega=2\pi f=314.1593\;\mathrm{rad/s}\):

- \(Z_A=30-j31.8310\;\Omega\), \(Z_B=20+j31.4159\;\Omega\), and \(Z_C=60\;\Omega\).
- \(Z_{parallel}=21.0348+j2.7047\;\Omega\); with the series resistor, \(Z_{total}=31.0348+j2.7047\;\Omega\).
- Source current: \(I_s=7.3831\angle-4.9808^\circ\;\mathrm{A}\).
- Parallel-network voltage: \(V_p=156.5795\angle2.3463^\circ\;\mathrm{V}\).
- Branch currents: \(I_A=3.5798\angle49.0424^\circ\;\mathrm{A}\), \(I_B=4.2044\angle-55.1721^\circ\;\mathrm{A}\), and \(I_C=2.6097\angle2.3463^\circ\;\mathrm{A}\).
- Load/source-delivered complex power: \(S=1691.69+j147.43\;\mathrm{VA}\), so \(P=1691.69\;\mathrm{W}\), \(Q=147.43\;\mathrm{var}\), \(|S|=1698.10\;\mathrm{VA}\), and PF = 0.9962 lagging.
- KCL: \(I_A+I_B+I_C=I_s\) within rounding. Resistor losses sum to 1691.69 W; capacitor and inductor reactive powers net to +147.43 var, confirming power balance.

This is an educational model of an ideal, de-energized circuit—not a construction or live-work instruction.

Run `python3 test_scripts/engineering/test_ac_circuit_reference.py` from the repository root to verify the reference values, rectangular KCL residual, and real/reactive power balance independently of the language model.
