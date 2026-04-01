#ifndef PHYSICS_H
#define PHYSICS_H

/* Общие константы для HTML-версии и C-симуляции */
#define GRAVITY_PX_S2    680.0f
#define AIR_FRICTION     0.988f
#define BOUNCE_REST      0.72f
#define RACKET_SCRUB     0.92f
#define RACKET_MAX_ANGLE 0.55f
#define BALL_RADIUS      14.0f
#define RACKET_HALF_W    100.0f
#define RACKET_HALF_H    8.0f

typedef struct {
  float x, y;
  float vx, vy;
} Ball;

typedef struct {
  float cx, cy;
  float angle;
} Racket;

void physics_step(Ball *b, const Racket *r, float dt, int *ball_on_racket);

#endif
