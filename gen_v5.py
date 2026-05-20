"""Generate level2Difficult_v5.brd  —  equation: 3x + 5 = 25 - 2x  (x = 4)"""
import uuid
from pathlib import Path

OUT_DIR = Path(__file__).parent / "frontend_react/public/CTAT/level2Difficult"

def tid(edge_id):
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"level2Difficult_v5_edge_{edge_id}"))

KC = {
    "none":               "<text>unnamed</text>",
    "combine_like_terms": "<text><![CDATA[combine_like_terms combine_like_terms]]></text>",
    "move_constants":     "<text><![CDATA[move_constants move_constants]]></text>",
    "remove_coefficient": "<text><![CDATA[remove_coefficient remove_coefficient]]></text>",
    "simplification":     "<text><![CDATA[simplification simplification]]></text>",
}

# ──────────────────────────────────────────────────────────────────────────────
# Edge definitions
# (id, preferPathMark, srcID, dstID, selection, input, hint, kc, actor)
# actor: "T" = Tutor (unevaluated), "S" = Student
# done edges: selection="done", input="-1"
# ──────────────────────────────────────────────────────────────────────────────
EDGES = [
    # ── Shared start ──────────────────────────────────────────────────────────
    (1,  True,  1,  2, "l-1", "3x+5",     'Please enter "3x+5" in the highlighted field.',   "none", "T"),
    (2,  True,  2,  3, "r-1", "25-2x",    'Please enter "25-2x" in the highlighted field.',  "none", "T"),

    # ── Path 6 (shortest, 11 steps): simultaneous x + constant move ──────────
    (3,  True,  3,  4, "l-2", "3x+2x",    "Mou els termes de la x a l'esquerra i els nombres a la dreta.", "combine_like_terms", "S"),
    (4,  True,  4,  5, "r-2", "25-5",     "Mou els termes de la x a l'esquerra i els nombres a la dreta.", "move_constants", "S"),
    (5,  True,  5,  6, "l-3", "5x",       "Combina els termes amb x: 3x + 2x.",                             "combine_like_terms", "S"),
    (6,  True,  6,  7, "r-3", "20",       "Simplifica 25 menys 5.",                                         "simplification", "S"),
    (7,  True,  7,  8, "l-4", "x",        "Divideix els dos costats entre 5 per ailllar la x.",             "remove_coefficient", "S"),
    (8,  True,  8,  9, "r-4", "20/5",     "Divideix els dos costats entre 5 per ailllar la x.",             "remove_coefficient", "S"),
    (9,  True,  9, 10, "l-5", "x",        "Res a fer aqui.",                                                 "none", "S"),
    (10, True, 10, 11, "r-5", "4",        "Simplifica 20 dividit entre 5.",                                  "simplification", "S"),
    (11, True, 11, 12, "done", "-1",      "Prem el boto de finalitzacio.",                                   "none", "S"),

    # ── Path 1 (13 steps): move constant first, then x ────────────────────────
    (12, False, 3, 13, "l-2", "3x",       "El 5 esta sumant. Resta 5 als dos costats.",                     "move_constants", "S"),
    (13, True, 13, 14, "r-2", "25-2x-5",  "El 5 esta sumant. Resta 5 als dos costats.",                     "move_constants", "S"),
    (14, True, 14, 15, "l-3", "3x+2x",    "Mou el terme -2x al costat esquerre sumant 2x als dos costats.", "combine_like_terms", "S"),
    (15, True, 15, 16, "r-3", "25-5",     "Mou el terme -2x al costat esquerre sumant 2x als dos costats.", "combine_like_terms", "S"),
    (16, True, 16, 17, "l-4", "5x",       "Combina els termes amb x i simplifica els nombres.",             "combine_like_terms", "S"),
    (17, True, 17, 18, "r-4", "20",       "Combina els termes amb x i simplifica els nombres.",             "combine_like_terms", "S"),
    (18, True, 18, 19, "l-5", "x",        "Ara ailllla la x.",                                               "remove_coefficient", "S"),
    (19, True, 19, 20, "r-5", "20/5",     "Ara ailllla la x.",                                               "remove_coefficient", "S"),
    (20, True, 20, 21, "l-6", "x",        "No has de fer res aqui.",                                         "none", "S"),
    (21, True, 21, 22, "r-6", "4",        "Simplifica 20 dividit entre 5.",                                  "simplification", "S"),
    (22, True, 22, 23, "done", "-1",      "Prem el boto de finalitzacio.",                                   "none", "S"),

    # ── Path 2 (15 steps): move constant, simplify right, then move x ─────────
    (23, False, 14, 24, "l-3", "3x",      "Res a fer aqui.",                                                 "none", "S"),
    (24, True, 24, 25, "r-3", "20-2x",    "Simplifica 25-2x-5: combina 25-5=20.",                           "simplification", "S"),
    (25, True, 25, 26, "l-4", "3x+2x",   "Suma 2x als dos costats per cancel.lar el -2x.",                  "combine_like_terms", "S"),
    (26, True, 26, 27, "r-4", "20",       "Ara els termes de la x s han cancel.lat al costat dret.",        "combine_like_terms", "S"),
    (27, True, 27, 28, "l-5", "5x",       "Combina 3x + 2x.",                                               "combine_like_terms", "S"),
    (28, True, 28, 29, "r-5", "20",       "Res a fer aqui.",                                                 "none", "S"),
    (29, True, 29, 30, "l-6", "x",        "Divideix els dos costats entre 5.",                               "remove_coefficient", "S"),
    (30, True, 30, 31, "r-6", "20/5",     "Divideix els dos costats entre 5.",                               "remove_coefficient", "S"),
    (31, True, 31, 32, "l-7", "x",        "Res a fer aqui.",                                                 "none", "S"),
    (32, True, 32, 33, "r-7", "4",        "Simplifica 20/5 = 4.",                                           "simplification", "S"),
    (33, True, 33, 34, "done", "-1",      "Prem el boto de finalitzacio.",                                   "none", "S"),

    # ── Path 3 (13 steps): move x first as 3x+2x+5, then constant ────────────
    (34, False, 3, 35, "l-2", "3x+2x+5", "Suma 2x als dos costats per moure el -2x cap a l esquerra.",     "combine_like_terms", "S"),
    (35, True, 35, 36, "r-2", "25",       "Suma 2x al costat dret: -2x+2x=0.",                              "combine_like_terms", "S"),
    (36, True, 36, 37, "l-3", "5x",       "Combina els termes de la x: 3x + 2x.",                           "combine_like_terms", "S"),
    (37, True, 37, 38, "r-3", "25-5",     "Mou el nombre 5 al costat dret restant 5 als dos costats.",      "move_constants", "S"),
    (38, True, 38, 39, "l-4", "5x",       "Res a fer aqui.",                                                 "none", "S"),
    (39, True, 39, 40, "r-4", "20",       "Simplifica 25-5.",                                               "simplification", "S"),
    (40, True, 40, 41, "l-5", "x",        "Divideix els dos costats entre 5.",                               "remove_coefficient", "S"),
    (41, True, 41, 42, "r-5", "20/5",     "Divideix els dos costats entre 5.",                               "remove_coefficient", "S"),
    (42, True, 42, 43, "l-6", "x",        "Res a fer aqui.",                                                 "none", "S"),
    (43, True, 43, 44, "r-6", "4",        "Simplifica 20/5.",                                               "simplification", "S"),
    (44, True, 44, 45, "done", "-1",      "Prem el boto de finalitzacio.",                                   "none", "S"),

    # ── Paths 4 + 5 shared start: l-2=3x+5+2x ────────────────────────────────
    (45, False, 3, 46, "l-2", "3x+5+2x", "Suma 2x als dos costats per moure el -2x cap a l esquerra.",     "combine_like_terms", "S"),
    (46, True, 46, 47, "r-2", "25",       "Suma 2x al costat dret: -2x+2x=0.",                              "combine_like_terms", "S"),

    # ── Path 4 (13 steps): direct combination from 3x+5+2x ──────────────────
    (47, True, 47, 48, "l-3", "5x",       "Combina els termes de la x: 3x + 2x.",                           "combine_like_terms", "S"),
    (48, True, 48, 49, "r-3", "25-5",     "Mou el nombre 5 al costat dret restant 5 als dos costats.",      "move_constants", "S"),
    (49, True, 49, 50, "l-4", "5x",       "Res a fer aqui.",                                                 "none", "S"),
    (50, True, 50, 51, "r-4", "20",       "Simplifica 25-5.",                                               "simplification", "S"),
    (51, True, 51, 52, "l-5", "x",        "Divideix els dos costats entre 5.",                               "remove_coefficient", "S"),
    (52, True, 52, 53, "r-5", "20/5",     "Divideix els dos costats entre 5.",                               "remove_coefficient", "S"),
    (53, True, 53, 54, "l-6", "x",        "Res a fer aqui.",                                                 "none", "S"),
    (54, True, 54, 55, "r-6", "4",        "Simplifica 20/5.",                                               "simplification", "S"),
    (55, True, 55, 56, "done", "-1",      "Prem el boto de finalitzacio.",                                   "none", "S"),

    # ── Path 5 (15 steps): partial x combination first, then move constant ───
    (56, False, 47, 57, "l-3", "5x+5",   "Combina els termes de la x: 3x + 2x = 5x.",                      "combine_like_terms", "S"),
    (57, True, 57, 58, "r-3", "25",       "Res a fer aqui.",                                                 "none", "S"),
    (58, True, 58, 59, "l-4", "5x",       "Mou el nombre 5 al costat dret restant 5 als dos costats.",      "move_constants", "S"),
    (59, True, 59, 60, "r-4", "25-5",     "Mou el nombre 5 al costat dret restant 5 als dos costats.",      "move_constants", "S"),
    (60, True, 60, 61, "l-5", "5x",       "Res a fer aqui.",                                                 "none", "S"),
    (61, True, 61, 62, "r-5", "20",       "Simplifica 25-5.",                                               "simplification", "S"),
    (62, True, 62, 63, "l-6", "x",        "Divideix els dos costats entre 5 per eliminar el coeficient.",   "remove_coefficient", "S"),
    (63, True, 63, 64, "r-6", "20/5",     "Divideix els dos costats entre 5 per eliminar el coeficient.",   "remove_coefficient", "S"),
    (64, True, 64, 65, "l-7", "x",        "Res a fer aqui.",                                                 "none", "S"),
    (65, True, 65, 66, "r-7", "4",        "Simplifica 20 dividit entre 5.",                                  "simplification", "S"),
    (66, True, 66, 67, "done", "-1",      "Prem el boto de finalitzacio.",                                   "none", "S"),
]

assert len(EDGES) == 66, f"Expected 66 edges, got {len(EDGES)}"

# ──────────────────────────────────────────────────────────────────────────────

def node_block(nid):
    text = "empty" if nid == 1 else f"state{nid}"
    y    = 25 + (nid - 1) * 150
    return (
        f'    <node locked="false" doneState="false">\n'
        f'        <text>{text}</text>\n'
        f'        <uniqueID>{nid}</uniqueID>\n'
        f'        <dimension>\n'
        f'            <x>-83</x>\n'
        f'            <y>{y}</y>\n'
        f'        </dimension>\n'
        f'    </node>'
    )


def edge_block(eid, pref, src, dst, sel, inp, hint, kc, actor):
    pref_str   = "true" if pref else "false"
    action_val = "ButtonPressed" if sel == "done" else "UpdateTextField"
    actor_val  = "Tutor (unevaluated)" if actor == "T" else "Student"
    transaction = tid(eid)

    msg = (
        f"<verb>NotePropertySet</verb>"
        f"<properties>"
        f"<MessageType>InterfaceAction</MessageType>"
        f"<transaction_id>{transaction}</transaction_id>"
        f"<Selection><value>{sel}</value></Selection>"
        f"<Action><value>{action_val}</value></Action>"
        f"<Input><value><![CDATA[{inp}]]></value></Input>"
        f"</properties>"
    )

    return (
        f'    <edge>\n'
        f'        <actionLabel preferPathMark="{pref_str}" minTraversals="1" maxTraversals="1">\n'
        f'            <studentHintRequest></studentHintRequest>\n'
        f'            <stepSuccessfulCompletion></stepSuccessfulCompletion>\n'
        f'            <stepStudentError></stepStudentError>\n'
        f'            <uniqueID>{eid}</uniqueID>\n'
        f'            <message>{msg}</message>\n'
        f'            <buggyMessage></buggyMessage>\n'
        f'            <successMessage></successMessage>\n'
        f'            <hintMessage><![CDATA[{hint}]]></hintMessage>\n'
        f'            <callbackFn></callbackFn>\n'
        f'            <actionType>Correct Action</actionType>\n'
        f'            <oldActionType>Correct Action</oldActionType>\n'
        f'            <checkedStatus>Never Checked</checkedStatus>\n'
        f'            <matchers Concatenation="true">\n'
        f'                <Selection>\n'
        f'                    <matcher>\n'
        f'                        <matcherType>ExactMatcher</matcherType>\n'
        f'                        <matcherParameter name="single"><![CDATA[{sel}]]></matcherParameter>\n'
        f'                    </matcher>\n'
        f'                </Selection>\n'
        f'                <Action>\n'
        f'                    <matcher>\n'
        f'                        <matcherType>ExactMatcher</matcherType>\n'
        f'                        <matcherParameter name="single"><![CDATA[{action_val}]]></matcherParameter>\n'
        f'                    </matcher>\n'
        f'                </Action>\n'
        f'                <Input>\n'
        f'                    <matcher>\n'
        f'                        <matcherType>ExactMatcher</matcherType>\n'
        f'                        <matcherParameter name="single"><![CDATA[{inp}]]></matcherParameter>\n'
        f'                    </matcher>\n'
        f'                </Input>\n'
        f'                <Actor linkTriggered="false">{actor_val}</Actor>\n'
        f'            </matchers>\n'
        f'        </actionLabel>\n'
        f'        <preCheckedStatus>No-Applicable</preCheckedStatus>\n'
        f'        <rule>\n'
        f'            {KC[kc]}\n'
        f'            <indicator>-1</indicator>\n'
        f'        </rule>\n'
        f'        <sourceID>{src}</sourceID>\n'
        f'        <destID>{dst}</destID>\n'
        f'        <traversalCount>0</traversalCount>\n'
        f'    </edge>'
    )


HEADER = (
    '<?xml version="1.0" standalone="yes"?>\n'
    '<stateGraph firstCheckAllStates="true" caseInsensitive="true" unordered="true"'
    ' lockWidget="true" hintPolicy="Use Both Kinds of Bias" version="4.0"'
    ' suppressStudentFeedback="Show All Feedback" highlightRightSelection="true"'
    ' confirmDone="false" startStateNodeName="%(startStateNodeName)%"'
    ' tutorType="Example-tracing Tutor">\n'
    '    <startNodeMessages>\n'
    '        <message>            <verb>NotePropertySet</verb>'
    '            <properties>                <MessageType>StartProblem</MessageType>'
    '                <ProblemName>empty</ProblemName>            </properties>        </message>\n'
    '        <message>            <verb>NotePropertySet</verb>'
    '            <properties>                <MessageType>StartStateEnd</MessageType>'
    '            </properties>        </message>\n'
    '    </startNodeMessages>'
)

FOOTER = (
    '    <EdgesGroups ordered="false">\n'
    '    </EdgesGroups>\n'
    '</stateGraph>'
)


def build_brd():
    parts = [HEADER]
    for nid in range(1, 68):
        parts.append(node_block(nid))
    for e in EDGES:
        parts.append(edge_block(*e))
    parts.append(FOOTER)
    return "\n".join(parts)


if __name__ == "__main__":
    brd = build_brd()

    brd_path = OUT_DIR / "FinalBRDs" / "level2Difficult_v5.brd"
    brd_path.parent.mkdir(parents=True, exist_ok=True)
    brd_path.write_text(brd, encoding="utf-8")
    print(f"BRD written: {brd_path}")
    print(f"  nodes: {brd.count('<node ')}, edges: {brd.count('<edge>')}")
