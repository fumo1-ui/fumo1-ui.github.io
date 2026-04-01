/* Консольная демо-симуляция тех же правил, что и в index.html.
 * Сборка (GCC/MinGW): gcc -O2 -std=c11 physics.c main.c -o balance_demo -lm
 */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include "physics.h"

int main(void) {
  const float W = 520.f, H = 420.f;
  const float CX = W / 2.f;
  const float CY = H / 2.f + 40.f;

  Ball ball = { CX, CY - 80.f, 0.f, 0.f };
  Racket racket = { CX, CY, 0.f };

  float dt = 1.f / 60.f;
  float time = 0.f;
  int on = 0;

  printf("balance-racket C demo (60 step/s), ball Y while above floor:\n");
  for (int i = 0; i < 300; i++) {
    racket.angle = 0.08f * sinf(time * 1.2f);
    physics_step(&ball, &racket, dt, &on);
    time += dt;
    if (i % 30 == 0)
      printf("t=%.2fs  ball=(%.1f, %.1f) on_racket=%d\n",
             time, ball.x, ball.y, on);
    if (ball.y > H + 40.f) {
      printf("ball fell at t=%.2fs\n", time);
      break;
    }
  }
  return 0;
}
