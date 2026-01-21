#pragma once
#include <stdbool.h>

typedef struct {
  char item_id[64];
  char label[64];
  bool recyclable;
  float confidence;
  int px, py;
  float depth_m;
} ItemDetection;

typedef struct {
  char item_id[64];
  char target_bin[16]; // "recycle" or "trash"
  float x, y, z; // world coords (meters)
} PickCommand;

typedef struct {
  char item_id[64]; // can be empty if not applicable
  char state[32]; // "idle","moving","grasping","dropping","error","complete"
  char message[128];
} ArmStatus;
