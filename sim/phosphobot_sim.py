#!/usr/bin/env python3
"""シミュレーションのロボットを複数台にして phosphobot を起動するラッパー。

phosphobot は `--only-simulation` だと仮想アームを1台しか作らない
（`robot.py` の `_find_robots()` が `[SO100Hardware(only_simulation=True)]` 固定）。
それだと実機の leader/follower 2台構成が再現できず、Snap! 側で「ロボット 2」を指定すると

    Robot ID 1 is out of range. Only 1 robots connected.

になってしまう。ここでは `_find_robots()` の後ろに台数ぶんの仮想アームを足してから
本来の CLI を起動する。PyBullet 側は `AxisRobot` のグリッドに沿って自動で並べてくれるので、
2台目以降は少し離れた位置に置かれる。

  SIM_ROBOTS=2 python sim/phosphobot_sim.py run --only-simulation --port 8020

引数はそのまま phosphobot の CLI に渡る。
"""
import os
import sys

from loguru import logger

from phosphobot.configs import config
from phosphobot.hardware import SO100Hardware
from phosphobot.robot import RobotConnectionManager

N_ROBOTS = max(1, int(os.environ.get("SIM_ROBOTS", "2")))

_original_find_robots = RobotConnectionManager._find_robots


async def _find_robots_with_extras(self) -> None:
    await _original_find_robots(self)
    if not config.ONLY_SIMULATION:
        return
    while len(self._all_robots) < N_ROBOTS:
        self._all_robots.append(SO100Hardware(only_simulation=True))
    logger.info(f"Simulation: {len(self._all_robots)} virtual robots ready")


RobotConnectionManager._find_robots = _find_robots_with_extras  # type: ignore[method-assign]

if __name__ == "__main__":
    from phosphobot.main import cli

    sys.argv[0] = "phosphobot"
    sys.exit(cli())
