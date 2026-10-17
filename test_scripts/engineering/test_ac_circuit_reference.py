#!/usr/bin/env python3
"""Deterministically verify the reference AC-network results in the regression prompt."""

import cmath
import math

V_SOURCE = 230.0 + 0.0j  # RMS volts
FREQUENCY_HZ = 50.0
R_SERIES = 10.0
OMEGA = 2.0 * math.pi * FREQUENCY_HZ

Z_A = 30.0 + 1.0 / (1j * OMEGA * 100e-6)  # 30 ohm + 100 uF capacitor
Z_B = 20.0 + 1j * OMEGA * 100e-3  # 20 ohm + 100 mH inductor
Z_C = 60.0 + 0.0j
Z_PARALLEL = 1.0 / (1.0 / Z_A + 1.0 / Z_B + 1.0 / Z_C)
Z_TOTAL = R_SERIES + Z_PARALLEL
I_SOURCE = V_SOURCE / Z_TOTAL
V_PARALLEL = I_SOURCE * Z_PARALLEL
I_A = V_PARALLEL / Z_A
I_B = V_PARALLEL / Z_B
I_C = V_PARALLEL / Z_C


def magnitude_angle(value: complex) -> tuple[float, float]:
    return abs(value), math.degrees(cmath.phase(value))


def assert_close(actual: float, expected: float, *, tolerance: float = 1e-6) -> None:
    if not math.isclose(actual, expected, rel_tol=tolerance, abs_tol=tolerance):
        raise AssertionError(f"Expected {expected}, got {actual}")


# Reference checkpoints from docs/tests/engineering-ac-circuit-analysis.md.
assert_close(Z_A.real, 30.0)
assert_close(Z_A.imag, -31.830988618379067)
assert_close(Z_B.real, 20.0)
assert_close(Z_B.imag, 31.415926535897935)
assert_close(Z_PARALLEL.real, 21.03476096637643)
assert_close(Z_PARALLEL.imag, 2.7047119360127434)
assert_close(Z_TOTAL.real, 31.03476096637643)
assert_close(Z_TOTAL.imag, 2.7047119360127434)
assert_close(abs(I_SOURCE), 7.383059419085259)
assert_close(math.degrees(cmath.phase(I_SOURCE)), -4.980802420076786)

# KCL must hold in rectangular form, and source complex power must match all
# resistor losses and net inductor/capacitor reactive power.
current_residual = I_A + I_B + I_C - I_SOURCE
assert abs(current_residual) < 1e-10, f"KCL residual is {current_residual} A"
source_power = V_SOURCE * I_SOURCE.conjugate()
resistive_losses = (
    abs(I_SOURCE) ** 2 * R_SERIES
    + abs(I_A) ** 2 * 30.0
    + abs(I_B) ** 2 * 20.0
    + abs(I_C) ** 2 * 60.0
)
reactive_power = abs(I_A) ** 2 * Z_A.imag + abs(I_B) ** 2 * Z_B.imag
assert_close(source_power.real, resistive_losses)
assert_close(source_power.imag, reactive_power)

print("AC reference regression passed")
print(f"Zparallel = {Z_PARALLEL.real:.4f} {Z_PARALLEL.imag:+.4f}j ohm")
print(f"Ztotal = {Z_TOTAL.real:.4f} {Z_TOTAL.imag:+.4f}j ohm")
print(f"Is = {abs(I_SOURCE):.4f} A ∠ {magnitude_angle(I_SOURCE)[1]:.4f}°")
print(f"S = {source_power.real:.2f} {source_power.imag:+.2f}j VA")
print(f"KCL residual = {abs(current_residual):.3e} A")
