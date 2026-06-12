"""
generate_pilot_figures.py
Generates all figures for the Solve2Learn pilot study appendix.
Reads from the questionnaire Excel and from the CLASS_A / CLASS_B SQLite databases.
Output: pilot_figures/ directory (PNG files at 180 dpi)
"""

import os, json, sqlite3, statistics
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.rcParams.update({'font.size': 12})
import matplotlib.patches as mpatches
import matplotlib.gridspec as gridspec
import openpyxl

# ── Paths ──────────────────────────────────────────────────────────────────────
QUESTIONNAIRE_PATH = 'backend_fastAPI/app/data/Solve2Learn (respuestas).xlsx'
DB_A = 'backend_fastAPI/app/data/classes/CLASS_A_03h44_01-06-2026/CLASS_A_03h44_01-06-2026.db'
DB_B = 'backend_fastAPI/app/data/classes/CLASS_B_04h13_01-06-2026/CLASS_B_04h13_01-06-2026.db'
OUT  = 'pilot_figures'
os.makedirs(OUT, exist_ok=True)

# ── Colour palette ─────────────────────────────────────────────────────────────
BLUE  = '#2E6FAB'
GREEN = '#27A76B'
GOLD  = '#E8A838'
RED   = '#D94F3D'
GRAY  = '#888888'
ORANGE = '#E8843A'
LIKERT_COLORS = ['#D94F3D', '#E8843A', '#F5C842', '#70B86E', '#2E6FAB']

# ── Load questionnaire data ────────────────────────────────────────────────────
wb = openpyxl.load_workbook(QUESTIONNAIRE_PATH)
ws = wb.active
all_rows = list(ws.iter_rows(min_row=2, values_only=True))

# Classify by timestamp: Class A = 04:14-04:21, Class B = 04:29-04:33
classA_q = [r for r in all_rows if r[0] and r[0].hour == 4 and r[0].minute < 25]
classB_q = [r for r in all_rows if r[0] and r[0].hour == 4 and r[0].minute >= 25]

print(f"Questionnaire: Total={len(all_rows)}, Class A={len(classA_q)}, Class B={len(classB_q)}")

# Column indices (0=timestamp, 1=Q1, …, 11=Q11, 12=Q12open, 13=Q13open)
Q_COLS = list(range(1, 12))  # Q1..Q11

SHORT_LABELS = {
    1: 'Ease of use\n(Q1)',
    2: 'Hints helpful\n(Q2)',
    3: 'Perceived\nlearning (Q3)',
    4: 'Exercises\nhelped (Q4)',
    5: 'Difficulty\nappropriate (Q5)',
    6: 'Noticed\nadaptivity (Q6)',
    7: 'Messages:\nnot frustrating (Q7)',
    8: 'Messages:\nnot distracting (Q8)',
    9: 'Messages:\ndesirable (Q9)',
    10: 'General\nsatisfaction (Q10)',
    11: 'Willingness\nto reuse (Q11)',
}

SHORT_LABELS_CAT = {
    1: 'Usabilitat\n(Q1)',
    2: 'Pistes\nútils (Q2)',
    3: 'Aprenen-\ntatge (Q3)',
    4: 'Exercicis\nútils (Q4)',
    5: 'Dificultat\nadequada (Q5)',
    6: 'Adaptació\npercebuda (Q6)',
    7: 'Missatges:\nno frustren (Q7)',
    8: 'Missatges:\nno distreuen (Q8)',
    9: 'Missatges:\ndesitjables (Q9)',
    10: 'Satisfacció\nglobal (Q10)',
    11: 'Intenció\nde reutilitzar (Q11)',
}

FULL_LABELS = {
    1: 'Q1 — Ease of use',
    2: 'Q2 — Hints helpful',
    3: 'Q3 — Perceived learning',
    4: 'Q4 — Exercises helped',
    5: 'Q5 — Difficulty appropriate',
    6: 'Q6 — Noticed adaptivity',
    7: 'Q7 — Messages: not frustrating',
    8: 'Q8 — Messages: not distracting',
    9: 'Q9 — Messages: desirable',
    10: 'Q10 — General satisfaction',
    11: 'Q11 — Willingness to reuse',
}

def get_vals(data, col):
    return [r[col] for r in data if r[col] is not None and isinstance(r[col], (int, float))]

def stats(data, col):
    v = get_vals(data, col)
    if not v:
        return None, None, 0
    return statistics.mean(v), (statistics.stdev(v) if len(v) > 1 else 0), len(v)


# ── Load database performance data ────────────────────────────────────────────

def load_db_stats(db_path):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    kcs_cols = ['p_move_constants', 'p_remove_coefficient', 'p_combine_like_terms',
                'p_normalize_negative_sign', 'p_expand_eliminate_parentheses']
    kc_sel = ', '.join(kcs_cols)

    c.execute('SELECT session_id FROM sessions')
    sessions = [r[0] for r in c.fetchall()]

    unique_problems = {}
    total_steps = {}
    initial_bkt = {}
    final_bkt = {}
    nlg = {i: [] for i in range(5)}

    c.execute('SELECT session_id, COUNT(DISTINCT problem_id) FROM steps GROUP BY session_id')
    for sid, cnt in c.fetchall():
        unique_problems[sid] = cnt

    c.execute('SELECT session_id, COUNT(*) FROM steps GROUP BY session_id')
    for sid, cnt in c.fetchall():
        total_steps[sid] = cnt

    for sid in sessions:
        c.execute('SELECT ' + kc_sel + ' FROM bkt_trace WHERE session_id=? ORDER BY step_idx ASC LIMIT 1', (sid,))
        row = c.fetchone()
        if row:
            initial_bkt[sid] = row

        c.execute('SELECT ' + kc_sel + ' FROM bkt_trace WHERE session_id=? ORDER BY step_idx DESC LIMIT 1', (sid,))
        row = c.fetchone()
        if row:
            final_bkt[sid] = row

        # NLG: initial = last step of phase 1 (diagnostic); final = last overall
        c.execute('SELECT ' + kc_sel + ' FROM bkt_trace WHERE session_id=? AND phase=1 ORDER BY step_idx DESC LIMIT 1', (sid,))
        diag_end = c.fetchone()
        c.execute('SELECT ' + kc_sel + ' FROM bkt_trace WHERE session_id=? ORDER BY step_idx DESC LIMIT 1', (sid,))
        last = c.fetchone()
        if diag_end and last and diag_end != last:
            for i in range(5):
                p0, pf = diag_end[i], last[i]
                nlg[i].append((pf - p0) / (1.0 - p0) if p0 < 1.0 else 0.0)

    conn.close()

    ex_per_student  = [unique_problems.get(s, 0) for s in sessions]
    att_per_student = [total_steps.get(s, 0) for s in sessions]
    had_adaptive    = sum(1 for e in ex_per_student if e > 3)

    return dict(
        sessions=sessions,
        ex_per_student=ex_per_student,
        att_per_student=att_per_student,
        had_adaptive=had_adaptive,
        initial_bkt=initial_bkt,
        final_bkt=final_bkt,
        nlg=nlg,
    )


statsA = load_db_stats(DB_A)
statsB = load_db_stats(DB_B)
print(f"DB Class A: {len(statsA['sessions'])} students, mean exercises {np.mean(statsA['ex_per_student']):.1f}")
print(f"DB Class B: {len(statsB['sessions'])} students, mean exercises {np.mean(statsB['ex_per_student']):.1f}")


# ═══════════════════════════════════════════════════════════════════════════════
# FIG J1 — Overall mean scores (all N=49)
# ═══════════════════════════════════════════════════════════════════════════════
# Use the 8 shared items (exclude Q7-Q9 which are Class A only)
SHARED_COLS = [1, 2, 3, 4, 5, 6, 10, 11]

means_all = [stats(all_rows, c)[0] for c in SHARED_COLS]
sds_all   = [stats(all_rows, c)[1] for c in SHARED_COLS]
labels_sh = [SHORT_LABELS[c] for c in SHARED_COLS]

fig, ax = plt.subplots(figsize=(12, 5.5))
x = np.arange(len(SHARED_COLS))
bars = ax.bar(x, means_all, yerr=sds_all, capsize=5, width=0.55,
              color=BLUE, alpha=0.85, edgecolor='white', linewidth=0.8,
              error_kw=dict(elinewidth=1.2, ecolor='#333', capthick=1.2))
ax.axhline(3, color='gray', linestyle='--', linewidth=1, alpha=0.6, label='Neutral (3)')
ax.axhline(4, color=GREEN, linestyle=':', linewidth=1, alpha=0.5, label='Positive reference (4)')
for bar, m in zip(bars, means_all):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.14,
            f'{m:.2f}', ha='center', va='bottom', fontsize=12, fontweight='bold', color='#1a1a1a')
ax.set_xticks(x)
ax.set_xticklabels(labels_sh, fontsize=11.5)
ax.set_ylim(0, 5.8)
ax.set_yticks([1, 2, 3, 4, 5])
ax.set_ylabel('Mean score (1–5 Likert scale)', fontsize=12)
ax.set_title('Mean questionnaire scores for all students (N = 49)\n'
             'Shared items Q1–Q6 and Q10–Q11; error bars = ±1 SD',
             fontsize=13, fontweight='bold', pad=12)
ax.legend(fontsize=11, loc='upper left')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.tight_layout()
plt.savefig(f'{OUT}/figJ1_overall_means.png', dpi=180, bbox_inches='tight')
plt.close()
print('Saved figJ1_overall_means')


# ═══════════════════════════════════════════════════════════════════════════════
# FIG J2 — Class A vs Class B (shared items)
# ═══════════════════════════════════════════════════════════════════════════════
means_A = [stats(classA_q, c)[0] for c in SHARED_COLS]
sds_A   = [stats(classA_q, c)[1] for c in SHARED_COLS]
means_B = [stats(classB_q, c)[0] for c in SHARED_COLS]
sds_B   = [stats(classB_q, c)[1] for c in SHARED_COLS]

fig, ax = plt.subplots(figsize=(13, 5.5))
x, w = np.arange(len(SHARED_COLS)), 0.35
b1 = ax.bar(x - w/2, means_A, w, yerr=sds_A, capsize=4,
            color=BLUE, alpha=0.85, edgecolor='white',
            label='Class A – messages enabled (n=23)',
            error_kw=dict(elinewidth=1, ecolor='#333'))
b2 = ax.bar(x + w/2, means_B, w, yerr=sds_B, capsize=4,
            color=GREEN, alpha=0.85, edgecolor='white',
            label='Class B – messages disabled (n=26)',
            error_kw=dict(elinewidth=1, ecolor='#333'))
for bar, m in zip(b1, means_A):
    if m: ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.08,
                  f'{m:.2f}', ha='center', va='bottom', fontsize=12, color='#1a1a1a')
for bar, m in zip(b2, means_B):
    if m: ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.08,
                  f'{m:.2f}', ha='center', va='bottom', fontsize=12, color='#1a1a1a')
ax.axhline(3, color='gray', linestyle='--', linewidth=1, alpha=0.5, label='Neutral (3)')
ax.set_xticks(x)
ax.set_xticklabels(labels_sh, fontsize=11)
ax.set_ylim(0, 6.0)
ax.set_yticks([1, 2, 3, 4, 5])
ax.set_ylabel('Mean score (1–5 Likert scale)', fontsize=12)
ax.set_title('Questionnaire comparison: Class A (messages) vs Class B (no messages)\n'
             'Shared items; error bars = ±1 SD',
             fontsize=13, fontweight='bold', pad=12)
ax.legend(fontsize=11.5, loc='upper left')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.tight_layout()
plt.savefig(f'{OUT}/figJ2_comparison_AB.png', dpi=180, bbox_inches='tight')
plt.close()
print('Saved figJ2_comparison_AB')


# ═══════════════════════════════════════════════════════════════════════════════
# FIG J3 — Stacked Likert distributions (all 11 items, all N=49 / A-only for Q7-9)
# ═══════════════════════════════════════════════════════════════════════════════
ALL_COLS = list(range(1, 12))
fig, ax = plt.subplots(figsize=(14, 5.5))
x = np.arange(len(ALL_COLS))
bottom = np.zeros(len(ALL_COLS))

rating_names = ['1 – Strongly disagree', '2 – Disagree', '3 – Neutral',
                '4 – Agree', '5 – Strongly agree']
for r_i, rating in enumerate([1, 2, 3, 4, 5]):
    counts = []
    for c_i, col in enumerate(ALL_COLS):
        data = classA_q if col in (7, 8, 9) else all_rows
        vals = get_vals(data, col)
        pct = 100 * vals.count(rating) / len(vals) if vals else 0
        counts.append(pct)
    bars = ax.bar(x, counts, bottom=bottom, color=LIKERT_COLORS[r_i],
                  label=rating_names[r_i], edgecolor='white', linewidth=0.4, width=0.65)
    for bar, cnt in zip(bars, counts):
        if cnt > 6:
            ax.text(bar.get_x()+bar.get_width()/2, bar.get_y()+bar.get_height()/2,
                    f'{cnt:.0f}%', ha='center', va='center',
                    fontsize=12, color='white', fontweight='bold')
    bottom += np.array(counts)

ax.set_xticks(x)
ax.set_xticklabels([SHORT_LABELS[c] for c in ALL_COLS], fontsize=10.5)
ax.set_ylim(0, 107)
ax.set_ylabel('Percentage of responses (%)', fontsize=12)
ax.set_title('Likert response distributions for all questionnaire items\n'
             'Q7–Q9: Class A only (n=23); Q1–Q6, Q10–Q11: all students (N=49)',
             fontsize=13, fontweight='bold', pad=12)
legend_patches = [mpatches.Patch(color=LIKERT_COLORS[i], label=rating_names[i]) for i in range(5)]
ax.legend(handles=legend_patches, fontsize=10.5, loc='upper right', framealpha=0.9)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.tight_layout()
plt.savefig(f'{OUT}/figJ3_distributions.png', dpi=180, bbox_inches='tight')
plt.close()
print('Saved figJ3_distributions')


# ═══════════════════════════════════════════════════════════════════════════════
# FIG J4 — Motivational messages (Class A, Q7–Q9)
# ═══════════════════════════════════════════════════════════════════════════════
msg_cols   = [7, 8, 9]
msg_labels = ['Q7 — Messages helped\navoid frustration',
              'Q8 — Messages did not\ndistract (inverted)',
              'Q9 — Would like messages\nin other apps']
msg_colors = [BLUE, GOLD, GREEN]

means_msg, sds_msg = [], []
for i, col in enumerate(msg_cols):
    vals = get_vals(classA_q, col)
    if i == 1:
        vals = [6 - v for v in vals]  # invert: higher = less distracting
    means_msg.append(statistics.mean(vals) if vals else 0)
    sds_msg.append(statistics.stdev(vals) if len(vals) > 1 else 0)

fig, ax = plt.subplots(figsize=(7.5, 5.5))
x = np.arange(3)
bars = ax.bar(x, means_msg, yerr=sds_msg, capsize=5, width=0.5,
              color=msg_colors, alpha=0.87, edgecolor='white',
              error_kw=dict(elinewidth=1.3, ecolor='#333'))
ax.axhline(3, color='gray', linestyle='--', linewidth=1, alpha=0.65, label='Neutral (3)')
ax.axhline(2.95, color=RED, linestyle=':', linewidth=0.8, alpha=0.5)
for bar, m in zip(bars, means_msg):
    ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.12,
            f'{m:.2f}', ha='center', va='bottom', fontsize=13, fontweight='bold')
ax.set_xticks(x)
ax.set_xticklabels(msg_labels, fontsize=11.5)
ax.set_ylim(0, 5.5)
ax.set_yticks([1, 2, 3, 4, 5])
ax.set_ylabel('Mean score (1–5 Likert scale)', fontsize=12)
ax.set_title('Motivational message evaluation (Class A, n=23)\n'
             'Q8 is shown inverted: higher = less distracting',
             fontsize=13, fontweight='bold', pad=12)
ax.legend(fontsize=11)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.tight_layout()
plt.savefig(f'{OUT}/figJ4_messages.png', dpi=180, bbox_inches='tight')
plt.close()
print('Saved figJ4_messages')


# ═══════════════════════════════════════════════════════════════════════════════
# FIG J5 — Radar chart (6 dimensions, A vs B vs All)
# ═══════════════════════════════════════════════════════════════════════════════
dim_cols   = [1, 3, 4, 5, 10, 11]
dim_labels = ['Ease of use\n(Q1)', 'Perceived\nlearning (Q3)',
              'Exercises\nhelpful (Q4)', 'Difficulty\nappropriate (Q5)',
              'General\nsatisfaction (Q10)', 'Willingness\nto reuse (Q11)']
vA   = [stats(classA_q, c)[0] for c in dim_cols]
vB   = [stats(classB_q, c)[0] for c in dim_cols]
vAll = [stats(all_rows, c)[0] for c in dim_cols]

N = len(dim_cols)
angles = [n / float(N) * 2 * np.pi for n in range(N)]
angles += angles[:1]

def close_lst(lst): return lst + lst[:1]

fig, ax = plt.subplots(figsize=(7.5, 7), subplot_kw=dict(polar=True))
ax.set_theta_offset(np.pi / 2)
ax.set_theta_direction(-1)
ax.set_thetagrids(np.degrees(angles[:-1]), dim_labels, fontsize=11.5)
ax.set_rlim(1, 5)
ax.set_rticks([2, 3, 4, 5])
ax.set_rlabel_position(15)
ax.plot(angles, close_lst(vAll), 'o-', linewidth=2, color=GRAY, label='All students (N=49)')
ax.fill(angles, close_lst(vAll), alpha=0.07, color=GRAY)
ax.plot(angles, close_lst(vA), 'o-', linewidth=2.2, color=BLUE,
        label='Class A – messages enabled (n=23)')
ax.fill(angles, close_lst(vA), alpha=0.12, color=BLUE)
ax.plot(angles, close_lst(vB), 's-', linewidth=2.2, color=GREEN,
        label='Class B – messages disabled (n=26)')
ax.fill(angles, close_lst(vB), alpha=0.12, color=GREEN)
ax.set_title('Questionnaire profile by dimension\n(Class A vs Class B vs All)',
             fontsize=13, fontweight='bold', pad=22)
ax.legend(loc='upper right', bbox_to_anchor=(1.55, 1.12), fontsize=11)
plt.tight_layout()
plt.savefig(f'{OUT}/figJ5_radar.png', dpi=180, bbox_inches='tight')
plt.close()
print('Saved figJ5_radar')


# ═══════════════════════════════════════════════════════════════════════════════
# FIG J6 — Histogram grid for all 11 questionnaire items
# ═══════════════════════════════════════════════════════════════════════════════
fig, axes = plt.subplots(3, 4, figsize=(14, 10))
axes_flat = axes.flatten()

for idx, col in enumerate(range(1, 12)):
    ax = axes_flat[idx]
    if col in (7, 8, 9):
        vA_h = get_vals(classA_q, col)
        vB_h = []
        label_n = 'Class A only (n=23)'
        data_all = vA_h
    else:
        vA_h = get_vals(classA_q, col)
        vB_h = get_vals(classB_q, col)
        data_all = vA_h + vB_h
        label_n = f'N=49'

    bins = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]
    if vA_h:
        ax.hist(vA_h, bins=bins, color=BLUE, alpha=0.65, label='Class A', edgecolor='white')
    if vB_h:
        ax.hist(vB_h, bins=bins, color=GREEN, alpha=0.65, label='Class B', edgecolor='white')
    ax.set_title(f'{FULL_LABELS[col]}', fontsize=10.5, fontweight='bold', pad=4)
    if data_all:
        mean_val = statistics.mean(data_all)
        ax.axvline(mean_val, color=RED, linestyle='--', linewidth=1.2, alpha=0.8,
                   label=f'Mean={mean_val:.2f}')
    ax.set_xlim(0.5, 5.5)
    ax.set_xticks([1, 2, 3, 4, 5])
    ax.set_xlabel('Rating', fontsize=9.5)
    ax.set_ylabel('Count', fontsize=9.5)
    ax.tick_params(labelsize=7.5)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    handles, labels_leg = ax.get_legend_handles_labels()
    ax.legend(handles, labels_leg, fontsize=8.5, loc='upper left')

axes_flat[11].axis('off')

fig.suptitle('Response histograms for all 11 questionnaire items\n'
             '(Q7–Q9: Class A only; Q1–Q6, Q10–Q11: both classes)',
             fontsize=13, fontweight='bold', y=1.01)
plt.tight_layout(rect=[0, 0, 1, 0.98])
plt.savefig(f'{OUT}/figJ6_item_histograms.png', dpi=180, bbox_inches='tight')
plt.close()
print('Saved figJ6_item_histograms')


# ═══════════════════════════════════════════════════════════════════════════════
# FIG J7 — Exercises completed per student: Class A vs Class B (histograms)
# ═══════════════════════════════════════════════════════════════════════════════
exA = statsA['ex_per_student']
exB = statsB['ex_per_student']

fig, axes = plt.subplots(1, 2, figsize=(12, 5), sharey=False)

bins_A = range(0, max(exA) + 2)
bins_B = range(0, max(exB) + 2)

axes[0].hist(exA, bins=bins_A, color=BLUE, edgecolor='white', alpha=0.85)
axes[0].axvline(np.mean(exA), color=RED, linestyle='--', linewidth=1.5,
                label=f'Mean = {np.mean(exA):.1f}')
axes[0].axvline(3, color=GRAY, linestyle=':', linewidth=1.2, alpha=0.7,
                label='End of diagnostic (3)')
axes[0].set_title(f'Class A – messages enabled (n={len(exA)})', fontsize=13, fontweight='bold')
axes[0].set_xlabel('Unique exercises completed', fontsize=12)
axes[0].set_ylabel('Number of students', fontsize=12)
axes[0].legend(fontsize=11)
axes[0].spines['top'].set_visible(False)
axes[0].spines['right'].set_visible(False)

axes[1].hist(exB, bins=bins_B, color=GREEN, edgecolor='white', alpha=0.85)
axes[1].axvline(np.mean(exB), color=RED, linestyle='--', linewidth=1.5,
                label=f'Mean = {np.mean(exB):.1f}')
axes[1].axvline(3, color=GRAY, linestyle=':', linewidth=1.2, alpha=0.7,
                label='End of diagnostic (3)')
axes[1].set_title(f'Class B – messages disabled (n={len(exB)})', fontsize=13, fontweight='bold')
axes[1].set_xlabel('Unique exercises completed', fontsize=12)
axes[1].set_ylabel('Number of students', fontsize=12)
axes[1].legend(fontsize=11)
axes[1].spines['top'].set_visible(False)
axes[1].spines['right'].set_visible(False)

fig.suptitle('Distribution of exercises completed per student\n'
             '(vertical dashed line = diagnostic threshold at 3 exercises)',
             fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig(f'{OUT}/figJ7_exercises_histogram.png', dpi=180, bbox_inches='tight')
plt.close()
print('Saved figJ7_exercises_histogram')


# ═══════════════════════════════════════════════════════════════════════════════
# FIG J8 — Performance metrics summary: side-by-side bar chart
# ═══════════════════════════════════════════════════════════════════════════════
attA = statsA['att_per_student']
attB = statsB['att_per_student']

metric_labels = ['Mean exercises\ncompleted', 'Mean total\nattempts (steps)', 'Students completing\ndiagnostic ≥1 ex. (%)']
valA = [np.mean(exA), np.mean(attA), 100 * statsA['had_adaptive'] / len(exA)]
valB = [np.mean(exB), np.mean(attB), 100 * statsB['had_adaptive'] / len(exB)]

fig, axes = plt.subplots(1, 3, figsize=(13, 5))

for i, ax in enumerate(axes):
    bars = ax.bar([0, 1], [valA[i], valB[i]], color=[BLUE, GREEN], width=0.5,
                  edgecolor='white', alpha=0.85)
    for bar, v in zip(bars, [valA[i], valB[i]]):
        ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.02*max(valA[i], valB[i]),
                f'{v:.1f}{"%" if i==2 else ""}', ha='center', va='bottom',
                fontsize=13, fontweight='bold')
    ax.set_xticks([0, 1])
    ax.set_xticklabels(['Class A\n(n=23)', 'Class B\n(n=26)'], fontsize=12)
    ax.set_title(metric_labels[i], fontsize=12, fontweight='bold')
    ax.set_ylim(0, max(valA[i], valB[i]) * 1.3)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    if i == 2:
        ax.set_ylabel('% of students', fontsize=11)
    else:
        ax.set_ylabel('Count', fontsize=11)

fig.suptitle('Performance summary: Class A vs Class B\n'
             '(Class A had ~5 additional minutes of interaction time)',
             fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig(f'{OUT}/figJ8_performance_summary.png', dpi=180, bbox_inches='tight')
plt.close()
print('Saved figJ8_performance_summary')


# ═══════════════════════════════════════════════════════════════════════════════
# FIG J9 — Completion funnel: diagnostic vs adaptive phase
# ═══════════════════════════════════════════════════════════════════════════════
nA, nB = len(statsA['sessions']), len(statsB['sessions'])
# Diagnostic = completed at least 3 exercises (1 per level)
diagA = sum(1 for e in exA if e >= 3)
diagB = sum(1 for e in exB if e >= 3)
# Adaptive = completed > 3 exercises
adaptA = statsA['had_adaptive']
adaptB = statsB['had_adaptive']

stages = ['Registered\n(joined session)', 'Completed\ndiagnostic (≥3 ex.)', 'Completed ≥1\nadaptive exercise']
vA_f = [nA, diagA, adaptA]
vB_f = [nB, diagB, adaptB]

fig, ax = plt.subplots(figsize=(10, 5.5))
x_f = np.arange(3)
w_f = 0.35
ax.bar(x_f - w_f/2, vA_f, w_f, color=BLUE, alpha=0.85, edgecolor='white',
       label='Class A – messages enabled (n=23)')
ax.bar(x_f + w_f/2, vB_f, w_f, color=GREEN, alpha=0.85, edgecolor='white',
       label='Class B – messages disabled (n=26)')
for xi, (va, vb) in enumerate(zip(vA_f, vB_f)):
    ax.text(xi - w_f/2, va + 0.4, f'{va}\n({100*va/nA:.0f}%)',
            ha='center', va='bottom', fontsize=12, color='#1a1a1a', fontweight='bold')
    ax.text(xi + w_f/2, vb + 0.4, f'{vb}\n({100*vb/nB:.0f}%)',
            ha='center', va='bottom', fontsize=12, color='#1a1a1a', fontweight='bold')
ax.set_xticks(x_f)
ax.set_xticklabels(stages, fontsize=12)
ax.set_ylabel('Number of students', fontsize=12)
ax.set_ylim(0, max(nA, nB) * 1.3)
ax.set_title('Session completion funnel: Class A vs Class B',
             fontsize=13, fontweight='bold', pad=12)
ax.legend(fontsize=11.5)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.tight_layout()
plt.savefig(f'{OUT}/figJ9_completion_funnel.png', dpi=180, bbox_inches='tight')
plt.close()
print('Saved figJ9_completion_funnel')


# ═══════════════════════════════════════════════════════════════════════════════
# FIG J10 — Initial vs final BKT per KC (combined, all students with BKT data)
# ═══════════════════════════════════════════════════════════════════════════════
kc_keys = ['p_move_constants', 'p_remove_coefficient', 'p_combine_like_terms',
           'p_normalize_negative_sign', 'p_expand_eliminate_parentheses']
kc_labels_short = ['Move\nconstants', 'Remove\ncoefficient', 'Combine\nlike terms',
                   'Normalise\nneg. sign', 'Expand\nparentheses']
kc_labels_full = ['move_constants', 'remove_coefficient', 'combine_like_terms',
                  'normalize_negative_sign', 'expand_eliminate_parentheses']

def mean_bkt(bkt_dict, kc_idx):
    vals = [v[kc_idx] for v in bkt_dict.values()]
    return np.mean(vals) if vals else 0

initA_means = [mean_bkt(statsA['initial_bkt'], i) for i in range(5)]
finalA_means = [mean_bkt(statsA['final_bkt'], i) for i in range(5)]
initB_means = [mean_bkt(statsB['initial_bkt'], i) for i in range(5)]
finalB_means = [mean_bkt(statsB['final_bkt'], i) for i in range(5)]

fig, axes = plt.subplots(1, 2, figsize=(14, 5.5), sharey=True)
x_bkt = np.arange(5)
w_bkt = 0.35

for ax_i, (ax, init_m, final_m, class_label, cls_color, n_cls) in enumerate([
    (axes[0], initA_means, finalA_means, 'Class A – messages enabled', BLUE, len(statsA['initial_bkt'])),
    (axes[1], initB_means, finalB_means, 'Class B – messages disabled', GREEN, len(statsB['initial_bkt'])),
]):
    b1 = ax.bar(x_bkt - w_bkt/2, init_m, w_bkt, color='#AAAAAA', alpha=0.85,
                edgecolor='white', label='Initial (post-diagnostic)')
    b2 = ax.bar(x_bkt + w_bkt/2, final_m, w_bkt, color=cls_color, alpha=0.85,
                edgecolor='white', label='Final (end of session)')
    ax.axhline(0.80, color='darkgreen', linestyle='--', linewidth=1, alpha=0.6, label='Mastery threshold (0.80)')
    ax.axhline(0.40, color='orangered', linestyle=':', linewidth=1, alpha=0.6, label='Struggle threshold (0.40)')
    for bar, v in zip(b1, init_m):
        ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.01,
                f'{v:.2f}', ha='center', va='bottom', fontsize=12)
    for bar, v in zip(b2, final_m):
        ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.01,
                f'{v:.2f}', ha='center', va='bottom', fontsize=12)
    ax.set_xticks(x_bkt)
    ax.set_xticklabels(kc_labels_short, fontsize=11)
    ax.set_ylim(0, 1.05)
    ax.set_yticks([0, 0.2, 0.4, 0.6, 0.8, 1.0])
    ax.set_ylabel('Mean P(L) estimate', fontsize=11.5)
    ax.set_title(f'{class_label}\n(n={n_cls} students with BKT data)', fontsize=12, fontweight='bold')
    ax.legend(fontsize=10, loc='upper left')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

fig.suptitle('Mean initial vs final BKT mastery estimates per KC\n'
             'Initial = first trace entry; Final = last trace entry',
             fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig(f'{OUT}/figJ10_bkt_initial_final.png', dpi=180, bbox_inches='tight')
plt.close()
print('Saved figJ10_bkt_initial_final')


# ═══════════════════════════════════════════════════════════════════════════════
# FIG J11 — NLG boxplot per KC (students with multi-round data)
# ═══════════════════════════════════════════════════════════════════════════════
nlgA = statsA['nlg']
nlgB = statsB['nlg']

fig, axes = plt.subplots(1, 5, figsize=(14, 5.5), sharey=True)
for i, ax in enumerate(axes):
    data_a = nlgA[i]
    data_b = nlgB[i]
    bp_data = [da for da in [data_a, data_b] if da]
    colors_box = [BLUE, GREEN][:len(bp_data)]
    labels_box = ['Class A', 'Class B'][:len(bp_data)]

    if bp_data:
        bp = ax.boxplot(bp_data, patch_artist=True, widths=0.5,
                        medianprops=dict(color='black', linewidth=1.8),
                        whiskerprops=dict(linewidth=1.2),
                        capprops=dict(linewidth=1.2),
                        flierprops=dict(marker='o', markersize=4, alpha=0.6))
        for patch, color in zip(bp['boxes'], colors_box):
            patch.set_facecolor(color)
            patch.set_alpha(0.75)

    ax.axhline(0, color='gray', linestyle='--', linewidth=1, alpha=0.6)
    ax.set_xticks([1, 2][:len(bp_data)])
    ax.set_xticklabels(labels_box[:len(bp_data)], fontsize=11)
    ax.set_title(kc_labels_short[i], fontsize=11.5, fontweight='bold')
    ax.set_ylabel('NLG', fontsize=11) if i == 0 else None
    ax.tick_params(labelsize=8.5)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    # Annotate n
    for j, d in enumerate(bp_data):
        ax.text(j+1, ax.get_ylim()[0] + 0.02*(ax.get_ylim()[1]-ax.get_ylim()[0]),
                f'n={len(d)}', ha='center', va='bottom', fontsize=9.5, color='#555')

fig.suptitle('Normalised learning gain (NLG) per KC: Class A vs Class B\n'
             'NLG = (P(L)_final − P(L)_initial) / (1 − P(L)_initial); only students with multi-round data',
             fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig(f'{OUT}/figJ11_nlg_per_kc.png', dpi=180, bbox_inches='tight')
plt.close()
print('Saved figJ11_nlg_per_kc')


# ═══════════════════════════════════════════════════════════════════════════════
# FIG J12 — Attempts (steps) per student: Class A vs B side-by-side histograms
# ═══════════════════════════════════════════════════════════════════════════════
attA_nz = [a for a in attA if a > 0]
attB_nz = [a for a in attB if a > 0]

fig, axes = plt.subplots(1, 2, figsize=(12, 5))

max_att = max(max(attA_nz) if attA_nz else 0, max(attB_nz) if attB_nz else 0)
bins_att = range(0, max_att + 15, 10)

axes[0].hist(attA_nz, bins=bins_att, color=BLUE, edgecolor='white', alpha=0.85)
axes[0].axvline(np.mean(attA_nz), color=RED, linestyle='--', linewidth=1.5,
                label=f'Mean = {np.mean(attA_nz):.0f}')
axes[0].set_title(f'Class A – messages enabled (n={len(attA)})', fontsize=13, fontweight='bold')
axes[0].set_xlabel('Total steps (attempts)', fontsize=12)
axes[0].set_ylabel('Number of students', fontsize=12)
axes[0].legend(fontsize=11)
axes[0].spines['top'].set_visible(False)
axes[0].spines['right'].set_visible(False)

axes[1].hist(attB_nz, bins=bins_att, color=GREEN, edgecolor='white', alpha=0.85)
axes[1].axvline(np.mean(attB_nz), color=RED, linestyle='--', linewidth=1.5,
                label=f'Mean = {np.mean(attB_nz):.0f}')
axes[1].set_title(f'Class B – messages disabled (n={len(attB)})', fontsize=13, fontweight='bold')
axes[1].set_xlabel('Total steps (attempts)', fontsize=12)
axes[1].set_ylabel('Number of students', fontsize=12)
axes[1].legend(fontsize=11)
axes[1].spines['top'].set_visible(False)
axes[1].spines['right'].set_visible(False)

fig.suptitle('Distribution of total steps (attempts) per student\n'
             '(Students with 0 steps excluded from histograms)',
             fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig(f'{OUT}/figJ12_attempts_histogram.png', dpi=180, bbox_inches='tight')
plt.close()
print('Saved figJ12_attempts_histogram')


# ═══════════════════════════════════════════════════════════════════════════════
# FIG J13 — A-B difference heatmap (shared items)
# ═══════════════════════════════════════════════════════════════════════════════
SHARED_8 = [1, 2, 3, 4, 5, 6, 10, 11]
shared_names = [FULL_LABELS[c] for c in SHARED_8]
diffs_AB = [stats(classA_q, c)[0] - stats(classB_q, c)[0] for c in SHARED_8]

fig, ax = plt.subplots(figsize=(10, 4))
colors_diff = [BLUE if d > 0 else RED for d in diffs_AB]
bars = ax.barh(shared_names, diffs_AB, color=colors_diff, alpha=0.8, edgecolor='white')
ax.axvline(0, color='black', linewidth=1)
for bar, d in zip(bars, diffs_AB):
    offset = 0.015 if d >= 0 else -0.015
    ax.text(d + offset, bar.get_y() + bar.get_height()/2,
            f'{d:+.2f}', va='center', ha='left' if d >= 0 else 'right',
            fontsize=12, fontweight='bold')
ax.set_xlabel('Mean difference (Class A − Class B)', fontsize=12)
ax.set_title('Mean score difference between Class A and Class B\n'
             'Positive = Class A scored higher; Negative = Class B scored higher',
             fontsize=13, fontweight='bold')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.tight_layout()
plt.savefig(f'{OUT}/figJ13_AB_differences.png', dpi=180, bbox_inches='tight')
plt.close()
print('Saved figJ13_AB_differences')


# ═══════════════════════════════════════════════════════════════════════════════
# FIG J14 — Prior BKT parameters vs deployed values (bar chart)
# ═══════════════════════════════════════════════════════════════════════════════
bkt_params = {
    'move_constants':               dict(p0=0.2323, pT=0.0832, pG=0.3688, pS=0.0989, pF=0.0149),
    'remove_coefficient':           dict(p0=0.3785, pT=0.0703, pG=0.4990, pS=0.0838, pF=0.0095),
    'combine_like_terms':           dict(p0=0.4260, pT=0.2862, pG=0.5365, pS=0.0241, pF=0.0697),
    'normalize_negative_sign':      dict(p0=0.6464, pT=0.3974, pG=0.3190, pS=0.0882, pF=0.1029),
    'expand_eliminate_parentheses': dict(p0=0.0611, pT=0.4806, pG=0.4311, pS=0.0046, pF=0.0889),
}
kc_names_plot = ['Move\nconstants', 'Remove\ncoeff.', 'Combine\nlike terms',
                 'Normalise\nneg. sign', 'Expand\nparentheses']
param_names = ['p0\n(prior)', 'pT\n(learn rate)', 'pG\n(guess)', 'pS\n(slip)', 'pF\n(forget)']
param_keys  = ['p0', 'pT', 'pG', 'pS', 'pF']
param_colors = [BLUE, GREEN, GOLD, RED, ORANGE]

fig, axes = plt.subplots(1, 5, figsize=(14, 5.5), sharey=True)
for i, (pk, pname, pcol) in enumerate(zip(param_keys, param_names, param_colors)):
    vals = [bkt_params[kc][pk] for kc in bkt_params]
    ax = axes[i]
    bars = ax.bar(range(5), vals, color=pcol, alpha=0.82, edgecolor='white')
    for bar, v in zip(bars, vals):
        ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.005,
                f'{v:.3f}', ha='center', va='bottom', fontsize=12)
    ax.set_xticks(range(5))
    ax.set_xticklabels(kc_names_plot, fontsize=9.5)
    ax.set_ylim(0, 0.7)
    ax.set_title(pname, fontsize=12, fontweight='bold')
    if i == 0: ax.set_ylabel('Probability', fontsize=11)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

fig.suptitle('Deployed Forget BKT parameters per KC\n'
             '(Cleaning v1, dataset 2006–07; selected model)',
             fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig(f'{OUT}/figJ14_bkt_parameters.png', dpi=180, bbox_inches='tight')
plt.close()
print('Saved figJ14_bkt_parameters')


print(f'\nAll {14} figures saved to {OUT}/')
