#include "physics.h"
#include <math.h>

static float clampf(float v, float lo, float hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

static void closest_point_on_segment(
  float px, float py,
  float x1, float y1, float x2, float y2,
  float *nx, float *ny, float *t
) {
  float dx = x2 - x1, dy = y2 - y1;
  float len2 = dx * dx + dy * dy;
  if (len2 <= 1e-8f) {
    *nx = x1; *ny = y1; *t = 0.f;
    return;
  }
  float tt = ((px - x1) * dx + (py - y1) * dy) / len2;
  tt = clampf(tt, 0.f, 1.f);
  *nx = x1 + tt * dx;
  *ny = y1 + tt * dy;
  *t = tt;
}

static void racket_ends(const Racket *r, float *x1, float *y1, float *x2, float *y2) {
  float c = cosf(r->angle);
  float s = sinf(r->angle);
  float hw = RACKET_HALF_W;
  *x1 = r->cx - hw * c;
  *y1 = r->cy - hw * s;
  *x2 = r->cx + hw * c;
  *y2 = r->cy + hw * s;
}

void physics_step(Ball *b, const Racket *r, float dt, int *ball_on_racket) {
  *ball_on_racket = 0;

  b->vy += GRAVITY_PX_S2 * dt;
  b->vx *= AIR_FRICTION;
  b->vy *= AIR_FRICTION;
  b->x += b->vx * dt;
  b->y += b->vy * dt;

  float x1, y1, x2, y2;
  racket_ends(r, &x1, &y1, &x2, &y2);

  float nx, ny, t_unused;
  closest_point_on_segment(b->x, b->y, x1, y1, x2, y2, &nx, &ny, &t_unused);

  float dx = b->x - nx;
  float dy = b->y - ny;
  float dist = sqrtf(dx * dx + dy * dy);
  float pen = BALL_RADIUS + RACKET_HALF_H - dist;

  if (pen > 0.f && b->vy > -40.f) {
    float seg_dx = x2 - x1;
    float seg_dy = y2 - y1;
    float seg_len = 2.f * RACKET_HALF_W;
    float fnx = -seg_dy / seg_len;
    float fny = seg_dx / seg_len;
    float vn = b->vx * fnx + b->vy * fny;
    if (vn < 0.f) {
      b->vx -= 2.f * vn * fnx;
      b->vy -= 2.f * vn * fny;
      b->vx *= BOUNCE_REST;
      b->vy *= BOUNCE_REST;
      b->vx *= RACKET_SCRUB;
      float push = pen + 1.f;
      b->x += fnx * push;
      b->y += fny * push;
      *ball_on_racket = 1;
    }
  }
}
