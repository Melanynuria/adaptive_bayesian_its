# Solve2Learn: An Adaptive Algebra Tutoring System Based on Bayesian Knowledge Tracing

**Bachelor's Thesis (Treball de Fi de Grau)**
**Melany Nuria Condori Claros**
**Universitat Pompeu Fabra — Escola d'Enginyeria**
**Academic Year 2024–2025**

---

## Abstract

In secondary education, the challenge of providing individualised support to each student within a classroom of twenty or more learners remains largely unaddressed by current digital tools, most of which digitise existing materials without genuine adaptive capability. This thesis presents *Solve2Learn*, an adaptive Intelligent Tutoring System (ITS) for first-degree linear equations, designed to operate in Spanish secondary school classrooms. The system applies **Bayesian Knowledge Tracing (BKT)** — specifically its Forget variant, which models skill decay — to estimate each student's mastery of five algebraic knowledge components in real time and to personalise subsequent exercise sequences accordingly. Exercises are authored using the **Cognitive Tutor Authoring Tools (CTAT)**, providing step-level feedback and structured hint sequences. BKT model parameters were estimated empirically from the **KDD Cup 2010 Algebra 2006–2007 dataset** using the pyBKT library, after a two-stage data cleaning and KC mapping process. Forget BKT consistently outperformed Classic BKT in cross-validated AUC (0.702 vs. 0.678 on the 2006–2007 dataset), and the refined cleaning strategy (v1) produced substantially more interpretable parameter estimates than the initial one. The resulting system comprises a FastAPI backend, a React frontend, a multi-database SQLite architecture, and a real-time teacher monitoring dashboard — all deployable from a single laptop via Cloudflare Tunnel without infrastructure requirements. The findings suggest that integrating principled probabilistic student modelling with classroom-compatible deployment constraints is technically feasible and educationally promising. A pilot study with secondary school students is planned to evaluate learning gains and system usability.

**Keywords:** Adaptive learning, Bayesian Knowledge Tracing, Intelligent Tutoring Systems, algebra education, knowledge components, educational data mining.

---

## Table of Contents

1. [Introduction](#1-introduction)
   - 1.1 Motivation and Educational Context
   - 1.2 Problem Statement and Research Question
   - 1.3 Project Objectives
   - 1.4 Contributions
   - 1.5 Scope and Limitations
   - 1.6 Document Structure

2. [State of the Art](#2-state-of-the-art)
   - 2.1 Artificial Intelligence in Education (AIED)
   - 2.2 Intelligent Tutoring Systems
     - 2.2.1 Architecture and Components
     - 2.2.2 Cognitive Tutors and CTAT
   - 2.3 Technology Integration in Education: The SAMR Model
   - 2.4 Student Modelling and Adaptivity
     - 2.4.1 Knowledge Components
     - 2.4.2 Bayesian Knowledge Tracing
     - 2.4.3 BKT Extensions and Variants
     - 2.4.4 Performance Factors Analysis
   - 2.5 Adaptive Learning Platforms
   - 2.6 Open Datasets for Student Modelling
   - 2.7 Summary and Positioning of the Present Work

3. [Requirements Analysis](#3-requirements-analysis)
   - 3.1 Functional Requirements
   - 3.2 Non-Functional Requirements
   - 3.3 Use Cases

4. [System Design](#4-system-design)
   - 4.1 General Architecture
   - 4.2 Domain Model
   - 4.3 Student Model: Forget BKT
   - 4.4 Pedagogical Model: Adaptive Exercise Selection
   - 4.5 User Interface Design
   - 4.6 Design Decisions and Alternatives Considered

5. [Implementation](#5-implementation)
   - 5.1 Technology Stack
   - 5.2 Database Architecture
   - 5.3 REST API
   - 5.4 BKT Implementation
   - 5.5 Adaptive Selection Algorithm
   - 5.6 Real-Time Communication via SSE
   - 5.7 CTAT Exercise Authoring
   - 5.8 Report Generation
   - 5.9 Deployment

6. [Data and Evaluation: BKT Parameter Estimation](#6-data-and-evaluation-bkt-parameter-estimation)
   - 6.1 KDD Cup 2010 Algebra Dataset Description
   - 6.2 Data Preprocessing and KC Mapping
   - 6.3 Data Cleaning
   - 6.4 Model Implementation and Parameters
   - 6.5 Comparison Across Datasets

7. [Pilot Study](#7-pilot-study) *(PENDING)*

8. [Conclusions](#8-conclusions)
   - 8.1 Achievement of Objectives
   - 8.2 Project Contributions
   - 8.3 Limitations
   - 8.4 Future Work

9. [References](#9-references)

10. [Appendices](#10-appendices)
    - Appendix A: BKT Parameter Table
    - Appendix B: CTAT Exercise Catalogue
    - Appendix C: Database Schema
    - Appendix D: REST API Specification
    - Appendix E: KC Mapping from KDD Cup Dataset
    - Appendix F: Project Timeline
    - Appendix G: AI Usage Declaration

---

## 1. Introduction

### 1.1 Motivation and Educational Context

In the twenty-first century, the impact of Artificial Intelligence (AI) on daily life is undeniable: it is transforming how people work, communicate, and solve problems across countless sectors. However, the integration of AI into educational environments still remains relatively limited. Given AI's growing capabilities to enhance human performance at an individual level, the gap between its potential and what classrooms currently offer is difficult to justify.

Traditional educational settings still largely rely on the "one-size-fits-all" model, in which a single teacher faces twenty or more students simultaneously, each with their own learning pace, background knowledge, and individual difficulties. As a result, some students fall behind the class flow while others remain insufficiently challenged, and the time available for one-on-one interaction is scarce. Bloom (1984) characterised this problem as the "two sigma" challenge, demonstrating that individual tutoring can produce learning gains two standard deviations above conventional classroom instruction — an advantage that mass education has struggled to match.

In the area of mathematics, these limitations are particularly evident. Mastery of any mathematical topic requires not only procedural skills but also conceptual understanding and the ability to apply learned strategies flexibly. In a diverse classroom, addressing these different learning profiles simultaneously represents a significant pedagogical challenge.

Intelligent Tutoring Systems (ITS) represent the key AI-driven tool designed to address these shortcomings. By offering tailored guidance, immediate feedback, and adaptive problem selection, they aim to simulate one-on-one human tutoring (VanLehn, 2011). Furthermore, probabilistic methods such as Bayesian Knowledge Tracing (BKT) enable systems to infer each student's mastery level based on observed interactions (Corbett & Anderson, 1995), and authoring environments such as the Cognitive Tutor Authoring Tools (CTAT) allow researchers and educators to define the cognitive structure of a domain efficiently (Aleven et al., 2009). Motivated by these developments, this project explores how probabilistic student modelling combined with cognitive tutoring authoring tools can be effectively applied to support the learning of first-degree linear equations, within a system that proposes personalised exercises based on each student's real-time knowledge state.

### 1.2 Problem Statement and Research Question

A growing number of digital learning platforms are used in Catalan secondary schools to support daily lessons. However, the vast majority of these platforms still rely on static content, fail to capture the underlying cognitive processes driving student performance, and provide limited adaptability. As a result, the "one-size-fits-all" approach is often merely digitised through basic automatisations, such as the automated correction of exercises, without reaching the transformation levels that technology genuinely enables (Puentedura, 2006).

Learning first-degree linear equations for the first time represents a particular challenge for students, as it marks a transition from arithmetic to algebraic abstraction. Effective instruction in this domain requires correctly representing skill hierarchies and common error patterns, and offering feedback that supports deep understanding rather than simple answer-checking. Furthermore, the time available in class is limited and the curriculum is fixed, leaving little room for teachers to tailor instruction to individual needs.

The central problem addressed in this project is the lack of personalisation, interpretability, and adaptivity in current educational tools available to Catalan secondary school teachers. There is a clear need for an ITS that goes beyond answer-checking, modelling the step-by-step process of solving an equation to ensure that every student's learning potential is better exploited.

This project addresses the following research question:

> *Can a Forget BKT-based adaptive tutoring system — parameterised from open student interaction data and deployed within a classroom-compatible web platform — provide interpretable mastery estimates and personalised exercise sequences that support the learning of first-degree linear equations in secondary education?*

### 1.3 Project Objectives

The main objective of this project is to design, implement, and evaluate an adaptive Intelligent Tutoring System, named Solve2Learn, for first-degree linear equations. The system operates on a dual-phase pedagogical model: an initial diagnostic assessment to infer each student's baseline knowledge, followed by an adaptive phase in which a personalised learning path is driven by a Bayesian Knowledge Tracing engine to optimise engagement and learning efficiency.

The specific objectives of the work are:

**O1.** Design and implement a BKT-based student model parameterised on real student interaction data to estimate domain-specific learning parameters.

**O2.** Implement a two-phase pedagogical workflow consisting of a diagnostic phase common to all students to establish an initial knowledge profile, and an adaptive recommendation logic that dynamically selects exercises addressing identified knowledge gaps or introduces more challenging items as mastery is achieved.

**O3.** Author a set of interactive exercises using CTAT covering different levels of algebraic complexity, with step-level hints that guide students towards the correct solution.

**O4.** Develop a web-based user interface that allows the system to present problems, capture student performance data, and communicate with the modelling backend in a school-compatible deployment configuration.

**O5.** Deploy the system in a real secondary school classroom and conduct a pilot study to evaluate its practical feasibility and measure learning gains across the target knowledge components. The pilot will additionally compare two conditions — sessions with motivational feedback messages enabled and sessions without — to assess the effect of affective support on student performance.

### 1.4 Contributions

The main contributions of this project are:

- **An implementation strategy for integrating CTAT cognitive definitions with a custom BKT inference engine** within a modern web-based software stack, demonstrating how exercise-authoring tools and probabilistic student modelling can be combined into a practical, classroom-deployable system.

- **A move beyond pass/fail assessment towards transparent, skill-level mastery modelling**, where the mastery of specific algebraic sub-skills is made visible and actionable — both to the adaptive engine and to the teacher through a live monitoring dashboard.

- **An open, scalable web-based framework for algebra tutoring** that balances theoretical rigour with practical, user-friendly implementation, deployable in a real classroom without dedicated server infrastructure.

- **A three-block adaptive exercise selection algorithm** that dynamically assigns personalised sets of 4–6 exercises per round by combining remedial, regular, and bonus blocks derived from BKT-estimated knowledge states, enabling nuanced instructional responses to individual learning profiles.

- **A teacher-in-the-loop real-time monitoring architecture** providing live per-student KC estimates, hand-raise alerts, session lifecycle control, and motivational message management during ongoing classroom sessions — a feature combination absent from existing open adaptive platforms.

### 1.5 Scope and Limitations

The system is scoped to first-degree linear equations in one variable, covering five algebraic knowledge components at three levels of complexity. It does not address other mathematical topics, multi-variable equations, or inequalities. The student model relies on a single BKT variant (Forget BKT) without per-student or per-exercise parameter individualisation, which limits its modelling precision compared to more advanced variants. The BKT parameters were estimated from a US middle-school population (KDD Cup 2010), which may not fully reflect the characteristics of Catalan secondary school students. The system requires an active internet connection and a device with a web browser; it does not support offline use. Classroom sessions are teacher-initiated, meaning the system is not designed for fully autonomous self-study outside school hours.

The system was designed with student data privacy as a primary constraint: student identifiers consist only of numeric roll codes containing no personally identifiable information, interaction logs are stored locally on the teacher's device, and no student data is transmitted to external servers beyond the Cloudflare Tunnel routing. Consent procedures for the pilot study follow UPF ethics guidelines for research involving minors in educational settings.

### 1.6 Document Structure

The remainder of this document is organised as follows. Chapter 2 reviews the relevant literature on intelligent tutoring systems, Bayesian Knowledge Tracing, its variants, existing adaptive learning platforms, and the SAMR model for technology integration in education. Chapter 3 presents the requirements analysis, including functional and non-functional requirements and use cases. Chapter 4 describes the system design, covering the domain model, student model, pedagogical model, interface design, and the rationale for key design decisions. Chapter 5 details the technical implementation of each system component. Chapter 6 describes the KDD Cup 2010 dataset and the methodology used to estimate the BKT parameters. Chapter 7 presents the pilot study and its results. Chapter 8 draws conclusions, revisits the contributions stated in §1.4, and outlines directions for future work. The document closes with a reference list and seven technical appendices.

---

## 2. State of the Art

Solve2Learn is situated within the field of Artificial Intelligence applied in Education (AIED), focusing on Intelligent Tutoring Systems (ITS), probabilistic methods used to model learner knowledge, and adaptive learning platforms. This section reviews the key concepts and existing work in these areas, and concludes by positioning the present project within them and identifying the specific gaps it addresses.

### 2.1 Artificial Intelligence in Education (AIED)

Artificial Intelligence in Education (AIED) is an interdisciplinary field that combines techniques of Artificial Intelligence (AI), learning sciences, data analytics, and human-computer interaction to support current teaching, learning, and evaluation practices (Holmes, Bialik, & Fadel, 2019).

Contemporary research shows that scientific impact in this area has grown significantly since 2022, with adaptive learning and personalised tutoring being the most frequently studied applications (Chen et al., 2020; Garzón, 2025). However, AIED is not simply the automation of existing processes. UNESCO insists that a human-centred approach is what gives technology educational value, following principles such as inclusion, equity, human agency, and the reduction of inequality gaps, algorithmic bias, and uncritical use of generative tools (UNESCO, 2025; Garzón, 2025).

Intelligent Tutoring Systems sit at the centre of this broader framework as one of the most studied and, therefore, mature applications of AIED (Son, 2024). Recent reviews describe ITS as an effective means of providing individualised support at scale across K-12 and higher education contexts, where one-to-one human tutoring is difficult to sustain (Xu et al., 2024).

### 2.2 Intelligent Tutoring Systems

#### 2.2.1 Architecture and Components

An Intelligent Tutoring System can be understood as a computer-based learning environment that provides individualised instructional support by adapting its behaviour to the state of each learner. From classical architectures to more recent implementations, these systems share four fundamental components:

- **Domain model**: represents the knowledge to be taught — what students should learn, the granularity of skills, and the relationships between them.
- **Student model**: captures the current state of the learner, tracking estimated knowledge dynamically based on observed interactions.
- **Pedagogical model**: defines the instructional strategies and interventions — which content to present, when to provide hints, and how to sequence activities.
- **User interface**: supports the interaction between the student and the system, rendering exercises, collecting responses, and displaying feedback.

(Hurtatiz et al., 2015; Castro-Schez et al., 2021; Shih et al., 2023)

The goal of an ITS is to simulate individual tutoring by registering actions, detecting errors, understanding difficulties, and responding immediately. These capabilities are particularly relevant in structured domains such as mathematics, programming, and syntactic analysis, where processes can be decomposed into well-defined steps and knowledge components (Castro-Schez et al., 2021; Wang et al., 2016). The effectiveness of ITS relative to conventional instruction has been systematically studied: VanLehn (2011) conducted a comprehensive meta-analysis concluding that well-designed ITS produce effect sizes of approximately 0.76 standard deviations over classroom instruction — a substantial improvement, though still below the two-sigma benchmark attributed to expert human tutors (Bloom, 1984).

#### 2.2.2 Cognitive Tutors and CTAT

The Cognitive Tutors developed at Carnegie Mellon University represent one of the most influential lines of work in ITS. These systems rely on cognitive models that allow the tutor to trace student reasoning step by step. However, one of their main drawbacks is the elevated design and authoring cost: expert knowledge and all possible solution paths must be represented in detail as production rules. In this context, the Cognitive Tutor Authoring Tools (CTAT; Aleven et al., 2009) introduced **Example-Tracing Tutors**, a paradigm in which the tutor's behaviour is specified by providing a step-by-step worked example while recognising multiple solution strategies and maintaining different interpretations of student behaviour.

A CTAT exercise consists of two components: an **HTML interface** that presents the problem and collects student input, and a **behavior graph** (.brd file) that encodes the acceptable solution paths. Each edge in the graph represents a student action, annotated with the knowledge component it exercises and with scaffolded hint text. At runtime, the CTAT JavaScript engine evaluates student inputs against the graph: correct edges trigger positive feedback, incorrect edges trigger corrective hints, and unrecognised inputs are flagged in red. The engine emits structured log events — ATTEMPT, HINT\_REQUEST, and RESULT — capturing the student's response, the KC involved, and the outcome. These events constitute the raw data that feeds the student model. However, CTAT's standard authoring workflow assumes manual behavior-graph construction in a graphical editor, and no established methodology exists for the programmatic generation of large, consistent exercise corpora from algebraic equation templates — a gap this project addresses through a Python-based generation pipeline (see §5.7).

### 2.3 Technology Integration in Education: The SAMR Model

Considering the kind of educational change that this project aims to produce, the SAMR model provides a useful evaluative lens. Developed by Puentedura (2006), it offers a four-level taxonomy for categorising how technology is integrated into classroom activities:

- **Substitution**: technology replaces a traditional tool with no functional change (e.g., a digital worksheet replacing a paper one).
- **Augmentation**: technology replaces a traditional tool but introduces a functional improvement (e.g., immediate automated feedback on answers).
- **Modification**: technology enables the significant redesign of an activity (e.g., adaptive sequencing that changes what each student practises based on their performance).
- **Redefinition**: technology makes possible tasks that would be unfeasible without it (e.g., continuous probabilistic modelling of individual knowledge states, visible to the teacher in real time during instruction).

The first two levels are grouped as **enhancement** levels, while the latter two are **transformation** levels (Hamilton, Rosenberg, & Akcaoglu, 2016). Most digital tools tend to operate at the enhancement level, digitising existing material while preserving the one-size-fits-all logic. Solve2Learn, as an adaptive ITS, aims for the transformation levels — specifically Modification and Redefinition — by enabling personalised, real-time adaptation of content with a granularity that traditional tools do not achieve.

### 2.4 Student Modelling and Adaptivity

Student modelling is the ITS component responsible for inferring the learner's current knowledge state from observed performance. This section introduces two families of models grounded in different assumptions about how knowledge is acquired and how it can be measured.

#### 2.4.1 Knowledge Components

A prerequisite for any student modelling approach is the definition of the units of knowledge to be tracked. In the ITS literature, these are called **Knowledge Components** (KCs) — atomic units of skill that map to observable student actions. KCs should be fine-grained enough to capture specific error patterns, yet broad enough to accumulate sufficient interaction data for reliable parameter estimation (Koedinger et al., 2012).

KC design is a non-trivial modelling decision. A taxonomy that is too coarse will group skills with different learning dynamics, producing unreliable estimates; a taxonomy that is too fine will result in data sparsity and unstable parameters. Koedinger et al. (2012) argue that a good KC model should maximise predictive accuracy of student performance while remaining pedagogically interpretable and actionable by instructors.

#### 2.4.2 Bayesian Knowledge Tracing

Bayesian Knowledge Tracing (BKT) is a widely used approach to modelling a knowledge state that is continuously changing (Corbett & Anderson, 1995). It is arguably the first model to relax the assumption of static knowledge states, representing the acquisition of knowledge as a partially observable Markov process. The knowledge required for a complete resolution process is split into Knowledge Components, and the learner is assumed to be in one of two latent states — "known" or "unknown" — for each of them. The model updates its belief about that state after each opportunity to practise the KC, based on whether the student responded correctly.

The classic BKT model is parameterised by four probabilities per KC:

| Parameter | Notation | Interpretation |
|-----------|----------|----------------|
| Prior knowledge | *p*(L₀) | Probability that the student already knows the KC before any practice |
| Learning rate | *p*(T) | Probability of transitioning from "unknown" to "known" after one practice opportunity |
| Guess | *p*(G) | Probability of a correct answer while in the "unknown" state |
| Slip | *p*(S) | Probability of an incorrect answer while in the "known" state |

The model assumes that these probabilities depend only on the learner's latent proficiency state and are independent of the specific learner or item (Corbett & Anderson, 1995).

**Observation model.** Given the current mastery estimate P(L_t), the probability of a correct response is:

$$P(\text{correct}_t) = P(L_t) \cdot (1 - p_S) + (1 - P(L_t)) \cdot p_G$$

**Bayesian update.** After observing the response, the posterior mastery probability is updated via Bayes' rule:

$$P(L_t \mid \text{correct}) = \frac{P(L_t) \cdot (1 - p_S)}{P(L_t) \cdot (1 - p_S) + (1 - P(L_t)) \cdot p_G}$$

$$P(L_t \mid \text{incorrect}) = \frac{P(L_t) \cdot p_S}{P(L_t) \cdot p_S + (1 - P(L_t)) \cdot (1 - p_G)}$$

**Transition.** The updated mastery estimate for the next opportunity is:

$$P(L_{t+1}) = P(L_t \mid \text{obs}) + (1 - P(L_t \mid \text{obs})) \cdot p_T$$

One of BKT's key strengths is its interpretability: each parameter carries a clear semantic meaning communicable to practitioners. Despite the advent of more complex models, BKT remains a reference method in educational data mining due to its robustness, interpretability, and practical effectiveness (Pardos & Heffernan, 2010).

#### 2.4.3 BKT Extensions and Variants

The standard BKT model has several well-known limitations, leading to a family of extensions. The most relevant to this work is **Forget BKT**, which introduces a fifth parameter:

| Parameter | Notation | Interpretation |
|-----------|----------|----------------|
| Forget probability | *p*(F) | Probability of transitioning from "known" to "unknown" |

This parameter captures skill decay between practice sessions, temporary performance drops, or loss of mastery when prerequisite skills have not been consolidated. The transition step becomes:

$$P(L_{t+1}) = P(L_t \mid \text{obs}) \cdot (1 - p_F) + (1 - P(L_t \mid \text{obs})) \cdot p_T$$

Empirical work has shown that Forget BKT achieves higher predictive accuracy on datasets exhibiting non-monotonic learning patterns (Qiu et al., 2011). Other notable extensions include **Individualised BKT** (Yudelson et al., 2013), which fits per-student parameters to capture individual differences in learning rate, and **Deep Knowledge Tracing** (Piech et al., 2015), which replaces the probabilistic model with a recurrent neural network, achieving higher predictive accuracy at the cost of interpretability. In this project, the Forget BKT variant without per-student or item-specific parameters was selected as the best balance between expressiveness, interpretability, and data requirements — a choice discussed further in Section 4.6. Despite these advances, no open platform combines Forget BKT with a classroom-deployable architecture that provides live KC-level estimates to teachers during an ongoing session within the Spanish secondary education context.

#### 2.4.4 Performance Factors Analysis

Performance Factors Analysis (PFA; Pavlik, Cen, & Koedinger, 2009) is an alternative student modelling approach that estimates the probability of a correct response using logistic regression over the student's cumulative history of successes and failures on each KC. Unlike BKT, PFA does not maintain a hidden latent state; instead, it models performance directly as a function of practice counts. PFA handles steps associated with multiple KCs more naturally than BKT, since its additive structure allows contributions from several KCs to be combined in a single prediction. However, it does not provide the same probabilistic interpretation of a mastery state, making it less directly actionable for threshold-based adaptive decisions of the kind used in Solve2Learn.

### 2.5 Adaptive Learning Platforms

Several adaptive learning platforms have preceded or run parallel to this project and informed its design decisions.

**Carnegie Learning / Cognitive Tutor** (now Mathia) was the first large-scale deployment of a BKT-based ITS in K-12 mathematics education. It covers algebra across multiple school years and has been evaluated in randomised controlled trials, yielding consistent positive effects on standardised test performance (Ritter et al., 2007). However, it is a commercial product with licensing costs and is not open for community extension or curricular adaptation.

**ASSISTments** (Heffernan & Heffernan, 2014) is a free, web-based platform that combines formative assessment with on-demand hints. It has been widely studied in educational research and has supported hundreds of randomised experiments. Unlike Solve2Learn, ASSISTments does not implement BKT-based adaptive sequencing by default but provides infrastructure for researchers to add it.

**Khan Academy** employs a mastery-based progression model but uses simpler heuristics rather than probabilistic student modelling. Students advance through a skill when they reach a streak of correct answers, without accounting for slip and guess probabilities or skill decay. Its primary strength is its breadth of content and open accessibility.

**Duolingo**, while not a mathematics system, is relevant because it explicitly models forgetting through spaced repetition algorithms, motivating the inclusion of a forget parameter in the student model. Its use of motivational feedback and affective design also informs the corresponding features of Solve2Learn.

None of the reviewed platforms is configurable for the Catalan language of instruction, open for curricular adaptation to the Spanish secondary curriculum, or deployable without institutional server infrastructure. Crucially, none provides live per-student KC-level visibility to teachers during an ongoing classroom session — the combination of features that motivates the present work.

### 2.6 Open Datasets for Student Modelling

The **KDD Cup 2010 Educational Data Mining Challenge** (Stamper et al., 2010) produced two publicly available datasets of student interactions with the Carnegie Learning Algebra Cognitive Tutor: the 2006–2007 and 2008–2009 cohorts. These datasets contain step-level interaction logs — including student identifiers, problem and step names, response outcomes, hint requests, and knowledge component labels — for tens of thousands of students and millions of interactions. They constitute the most widely used benchmark datasets in the educational data mining community and provide a solid empirical basis for estimating BKT parameters. The datasets are hosted on the **PSLC DataShop** (Koedinger et al., 2010), a repository that provides a standardised export format recording one row per student step. The KDD Cup 2010 dataset, while the most widely used benchmark in educational data mining, was collected from a US middle-school population using a commercial tutor, raising questions about parameter transferability to other educational contexts — a limitation acknowledged in this project and addressed through the KC mapping and cleaning methodology described in Chapter 6.

### 2.7 Summary and Positioning of the Present Work

The literature reviewed in this chapter establishes that ITS have demonstrated consistent effectiveness in structured domains; that BKT — and in particular its Forget variant — provides an interpretable and well-validated basis for student modelling; and that CTAT lowers the authoring barrier for building step-level tutors without requiring formal cognitive rule specification. At the same time, several gaps remain.

Existing adaptive platforms (Carnegie Learning, ASSISTments) are designed for English-speaking contexts, carry commercial or infrastructure costs, and cannot be configured for the specific curricular structure of Spanish secondary education. Simpler platforms such as Khan Academy operate at the SAMR enhancement level, digitising material without genuine adaptive capability at the KC level. None of the reviewed systems provides a live, teacher-facing view of per-student BKT estimates during an ongoing classroom session, nor is any of them suited to the Catalan language of instruction.

Solve2Learn is designed to address these gaps: a fully open, classroom-deployable ITS that applies Forget BKT — parameterised from real student data — to first-degree linear equations within the Catalan secondary school context. It incorporates a step-level CTAT exercise corpus, an explicit teacher-in-the-loop monitoring layer, and a three-block adaptive selection algorithm. In terms of the SAMR model, the system targets the Modification and Redefinition levels, enabling a form of personalised, evidence-based instruction that has no practical equivalent in the tools currently available to Catalan secondary school teachers.

---

## 3. Requirements Analysis

### 3.1 Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | The system shall allow a teacher to create a class session identified by a class code. |
| FR-02 | The system shall allow students to join a session using a class code and a student identifier. |
| FR-03 | The system shall present a diagnostic phase consisting of three pre-defined exercises, one per difficulty level, at the start of each session. |
| FR-04 | The system shall estimate the student's knowledge state for all five KCs using BKT after the diagnostic phase. |
| FR-05 | The system shall assign a personalised set of exercises to each student based on their BKT-estimated knowledge state. |
| FR-06 | The system shall present exercises through embedded CTAT tutors that provide step-level feedback and hints. |
| FR-07 | The system shall log all student interactions (attempts, hints, and completions) and persist them in a database. |
| FR-08 | The system shall update the student's knowledge state after each round of exercises. |
| FR-09 | The system shall display a real-time dashboard to the teacher showing per-student KC estimates, hand-raise alerts, and exercise progress. |
| FR-10 | The system shall allow the teacher to enable or disable motivational messages shown to students upon incorrect answers. |
| FR-11 | The system shall allow the teacher to end the class session, triggering navigation to the results page for all connected students. |
| FR-12 | The system shall generate downloadable Excel reports for the teacher at the class and student levels. |
| FR-13 | The system shall display a personalised results summary to each student at the end of the session, including initial and final BKT estimates and normalised learning gain. |
| FR-14 | The system shall support session recovery, allowing a student who reconnects mid-session to resume from where they left off. |
| FR-15 | The system shall allow a student to raise a hand alert when they have struggled with a step three or more times. |

### 3.2 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | **Performance**: The BKT computation and exercise assignment shall complete within 5 seconds of the diagnostic phase ending. |
| NFR-02 | **Reliability**: Student interaction logs shall be persisted immediately and shall not be lost in the event of a network interruption. |
| NFR-03 | **Scalability**: The system shall support at least 30 concurrent students in a single class session without degradation of response time. |
| NFR-04 | **Usability**: The student interface shall be operable on any modern web browser on a tablet or laptop without installation. |
| NFR-05 | **Accessibility**: All student-facing text shall be written in Catalan, consistent with the target school's language of instruction. |
| NFR-06 | **Security**: Teacher access shall be protected by a password. Student identifiers shall not include personally identifiable information. |
| NFR-07 | **Maintainability**: The exercise corpus shall be extendable without modifying backend code. New exercises placed in the CTAT directory are automatically discovered by the exercise pool. |
| NFR-08 | **Deployability**: The system shall be accessible to students on school devices without requiring firewall configuration, using a Cloudflare Tunnel for network access. |

### 3.3 Use Cases

The system involves two primary actors: the **Teacher** and the **Student**.

**UC-01: Start a class session (Teacher)**
The teacher navigates to the teacher panel, enters a class code, and starts the session. The system creates a new class database and opens the class for student connections.

**UC-02: Join a session and complete diagnostics (Student)**
The student enters the class code and their identifier. The system verifies the class is active, creates a session, and presents the three diagnostic exercises. The student works through the CTAT interfaces, receiving step-level feedback. Upon completion, the student is redirected to the waiting page.

**UC-03: Receive and complete personalised exercises (Student)**
After the BKT computation completes, the student receives a personalised set of 4–6 exercises (depending on whether remediation applies). They complete the exercises in the CTAT environment and are returned to the waiting page.

**UC-04: Monitor class progress (Teacher)**
While the session is active, the teacher's dashboard displays a live table updating every 5 seconds. Each row shows a student's KC colour-coded knowledge estimates, hand-raise status, completed exercise count, and assigned level and difficulty.

**UC-05: End the session and view results (Teacher / Student)**
The teacher clicks "End session." All connected student clients detect the session end via polling and navigate automatically to the results page, which displays the student's initial and final KC estimates and the normalised learning gain per KC.

---

## 4. System Design

### 4.1 General Architecture

Solve2Learn follows a three-tier client–server architecture:

```
┌────────────────────────────────────────────────────────┐
│                      CLIENT TIER                       │
│                                                        │
│   React SPA (Vite + TypeScript)                        │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│   │  Start   │ │  Tutor   │ │ Waiting  │ │ Teacher │ │
│   │  Page    │ │  Page    │ │  Page    │ │  Page   │ │
│   └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
│                    │  ↕ HTTP/SSE (Axios)               │
└────────────────────┼───────────────────────────────────┘
                     │
┌────────────────────┼───────────────────────────────────┐
│                  SERVER TIER                           │
│                                                        │
│   FastAPI (Python) — single-file application           │
│   ├── REST API endpoints                               │
│   ├── BKT engine (compute_knowledge_states)            │
│   ├── Adaptive exercise selection (select_exercises)   │
│   ├── SSE stream (classroom events)                    │
│   └── Report generation (openpyxl)                     │
│                    │                                   │
└────────────────────┼───────────────────────────────────┘
                     │
┌────────────────────┼───────────────────────────────────┐
│                   DATA TIER                            │
│                                                        │
│   SQLite (multi-database)                              │
│   ├── app.db (global session registry)                 │
│   ├── {class}_{timestamp}.db (per-class)               │
│   └── students/{student_id}.db (per-student steps)     │
│                                                        │
│   CTAT Exercise Files (static)                         │
│   └── /CTAT/{level}{difficulty}/HTML/*.html + *.brd    │
└────────────────────────────────────────────────────────┘
```

External access is provided through a **Cloudflare Tunnel**, which exposes the local FastAPI server to the internet under a stable URL without requiring port-forwarding or a public IP address. This design allows the system to be run on a teacher's laptop and accessed by all students on the school network through their browsers.

### 4.2 Domain Model

#### 4.2.1 Knowledge Components

Five knowledge components (KCs) are modelled, each corresponding to a specific algebraic manipulation required to solve first-degree linear equations. These KCs are organised into three hierarchical levels:

| Level | KC Key | KC Description |
|-------|--------|----------------|
| Level 1 | `move_constants` | Moving constant terms from one side of the equation to the other by applying additive inverse |
| Level 1 | `remove_coefficient` | Eliminating the variable's coefficient by dividing both sides of the equation |
| Level 2 | `combine_like_terms` | Collecting and simplifying variable terms on the same side of the equation |
| Level 2 | `normalize_negative_sign` | Handling equations where the variable term has a negative leading coefficient |
| Level 3 | `expand_eliminate_parentheses` | Applying the distributive property to expand parenthetical expressions before further simplification |

#### 4.2.2 Prerequisite Structure

The KC hierarchy encodes explicit prerequisite relationships:

- **Level 2 KCs** (`combine_like_terms`, `normalize_negative_sign`) require Level 1 mastery: both `move_constants` and `remove_coefficient` must reach P(L) ≥ 0.50 before Level 2 exercises are assigned.
- **Level 3** (`expand_eliminate_parentheses`) requires Level 2 mastery: the average P(L) of Level 2 KCs must reach 0.80 for Level 2 to be skipped and Level 3 to become the working level.

This structure reflects the cumulative nature of algebraic knowledge and prevents the system from assigning exercises whose prerequisites have not been consolidated.

#### 4.2.3 Exercise Taxonomy

The exercise corpus is organised along two dimensions:
- **Level** (1, 2, 3): corresponding to the three KC groups.
- **Difficulty** (Easy, Medium, Difficult): reflecting the structural complexity of the equation (e.g., number of operations, presence of mixed terms, or multi-step chains).

The full corpus comprises **70 CTAT exercises** distributed across 9 level–difficulty combinations:

| Level | Easy | Medium | Difficult | Total |
|-------|------|--------|-----------|-------|
| 1     | 10   | 10     | 5         | 25    |
| 2     | 5    | 10     | 5         | 20    |
| 3     | 10   | 5      | 10        | 25    |
| **Total** | **25** | **25** | **20** | **70** |

Three exercises — `level1Difficult_v1`, `level2Difficult_v1`, and `level3Difficult_v1` — are reserved exclusively for the diagnostic phase and are never included in personalised rounds.

### 4.3 Student Model: Forget BKT

#### 4.3.1 Formal Model

Each KC is modelled independently as a two-state Hidden Markov Model. The latent binary state represents whether the student has mastered the KC. This state is not directly observable; it is inferred from the observable sequence of correct and incorrect responses.

The Forget BKT model uses five parameters per KC:

| Symbol | Parameter | Interpretation |
|--------|-----------|----------------|
| P(L₀) = p₀ | Prior mastery | Probability that the student already knows the KC before the session |
| P(T) = p_L | Learning rate | Probability of transitioning from not-knowing to knowing after one practice opportunity |
| P(F) = p_F | Forget rate | Probability of transitioning from knowing to not-knowing |
| P(G) = p_G | Guess | Probability of a correct response without mastery |
| P(S) = p_S | Slip | Probability of an incorrect response despite mastery |

**Observation model.** Given the current mastery estimate P(L_t), the probability of observing a correct response is:

$$P(\text{correct}_t) = P(L_t) \cdot (1 - p_S) + (1 - P(L_t)) \cdot p_G$$

**Bayesian posterior update.** After observing the student's response, the posterior mastery probability is:

$$P(L_t \mid \text{correct}) = \frac{P(L_t) \cdot (1 - p_S)}{P(L_t) \cdot (1 - p_S) + (1 - P(L_t)) \cdot p_G}$$

$$P(L_t \mid \text{incorrect}) = \frac{P(L_t) \cdot p_S}{P(L_t) \cdot p_S + (1 - P(L_t)) \cdot (1 - p_G)}$$

**Transition step with forgetting.** The updated mastery estimate for the next opportunity is:

$$P(L_{t+1}) = P(L_t \mid \text{obs}) \cdot (1 - p_F) + (1 - P(L_t \mid \text{obs})) \cdot p_L$$

This formulation captures both learning (second term) and forgetting (first term is scaled by 1 − p_F rather than 1). When p_F = 0, the formula reduces to the classic BKT transition.

**Hint handling.** Hint-assisted correct responses are treated as incorrect for the purposes of the BKT update, because they do not provide evidence of independent mastery — they may reflect hint use rather than genuine knowledge (Corbett & Anderson, 1995). Formally, an attempt is marked as `correct` only when the student's response is correct *and* no hint was used on that step.

#### 4.3.2 Mastery Thresholds

Three threshold values govern the instructional decisions derived from the BKT estimates:

| Threshold | Value | Role |
|-----------|-------|------|
| `STRUGGLE_THRESHOLD` | 0.40 | P(L) below this value triggers remedial exercises for that KC |
| `MASTERY_THRESHOLD` | 0.80 | P(L) at or above this value for a level's KCs allows the system to advance to the next level |
| `LEVEL_SKIP_THRESHOLD` | 0.85 | Per-KC threshold used for the full-mastery flag, signalling all skills are sufficiently consolidated |
| `PREREQ_THRESHOLD` | 0.50 | Minimum P(L) for Level 1 KCs before Level 2 exercises become eligible |

### 4.4 Pedagogical Model: Adaptive Exercise Selection

#### 4.4.1 Three-Block Assignment Algorithm

At the end of the diagnostic phase (and after each subsequent practice round), the system runs the adaptive exercise selection algorithm to generate a personalised set of exercises for the student. The algorithm operates in three sequential blocks, concatenating their outputs into a single ordered exercise queue.

**Block 1 — Remedial (0 or 2 exercises):**
The remedial block is activated when any KC whose prerequisites are met has P(L) < 0.40 (STRUGGLE\_THRESHOLD). For each such KC, the system draws from the Easy pool at that KC's level. Up to 2 exercises are selected from the combined remedial pool, shuffled. If no KC is below the struggle threshold, this block contributes zero exercises.

**Block 2 — Regular (3 exercises):**
The system determines the student's *working level* by iterating from Level 1 to Level 3. A level is skipped if its average P(L) ≥ 0.80 (MASTERY\_THRESHOLD). The first non-skipped level becomes the working level. Difficulty is assigned as:
- **Easy** if the level's average P(L) < 0.40
- **Medium** if 0.40 ≤ average P(L) < 0.80
- **Difficult** if average P(L) ≥ 0.80 but the level is not yet skipped (i.e., individual KCs have not all cleared the per-KC skip threshold)

Within the chosen (level, difficulty) pool, exercises are filtered to target the weakest KCs specifically, using a version-range mapping that assigns certain exercise versions to specific KCs. Up to 3 exercises are drawn from the filtered pool, shuffled.

**Block 3 — Bonus (1 exercise):**
One exercise is drawn randomly from any Medium or Difficult pool across all levels, excluding already-assigned exercises. This provides varied exposure beyond the student's current working level and prevents the round from becoming purely remedial.

**Total round size:** 2 (remedial) + 3 (regular) + 1 (bonus) = **6 exercises** when remediation applies, or 0 + 3 + 1 = **4 exercises** otherwise.

Already-completed exercises are excluded throughout, ensuring no exercise is repeated across rounds.

**Figure 1.** Three-block adaptive selection algorithm.

```
  BKT Update (all 5 KCs from previous round)
                    │
                    ▼
       ┌────────────────────────┐
       │   BLOCK 1 — REMEDIAL   │
       │  Any KC with P(L)<0.40 │
       │  and prerequisites met?│
       │  YES → 2 Easy exercises│
       │  NO  → 0 exercises     │
       └────────────┬───────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │   BLOCK 2 — REGULAR    │
       │  Find working level    │
       │  (first non-skipped)   │
       │  Assign difficulty     │
       │  Target weakest KC     │
       │  → 3 exercises         │
       └────────────┬───────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │   BLOCK 3 — BONUS      │
       │  Random Med/Diff pool  │
       │  across all levels     │
       │  → 1 exercise          │
       └────────────┬───────────┘
                    │
                    ▼
         Personalised queue
            (4–6 exercises)
```

#### 4.4.2 Diagnostic Phase

All sessions begin with a fixed diagnostic phase of **three exercises**: `level1Difficult_v1`, `level2Difficult_v1`, and `level3Difficult_v1`. These exercises are selected to produce an informative initial BKT estimate across all five KCs, because Difficult-level exercises activate all the relevant algebraic steps. The diagnostic phase always presents these three exercises in order, regardless of the student's prior performance.

Once the student completes all three diagnostic exercises, the BKT engine runs in the background (asynchronously) and generates the first personalised assignment. The student sees a waiting page with an animated spinner during this computation.

#### 4.4.3 Feedback and Motivational Support

The CTAT engine provides immediate, step-level feedback within each exercise. Correct steps are highlighted in green; incorrect steps are highlighted in red. When a student requests a hint, the CTAT engine provides the next step in a scaffolded hint sequence.

At the application level, two additional feedback mechanisms are implemented:

- **Motivational toasts**: When a student makes an incorrect attempt, the system (if the teacher has enabled motivational messages) displays a randomly selected motivational message in a floating popup that disappears after 4 seconds. The message pool contains 15 growth-mindset-oriented phrases designed to maintain student motivation after errors.
- **Hand-raise alert**: When a student makes three or more incorrect attempts on the same step, a raise-hand button becomes available. Clicking it sends an alert to the teacher dashboard, flagging the student as needing assistance. The teacher can then see this flag in real time and intervene.

The teacher can toggle motivational messages on and off from the dashboard, enabling a simple A/B comparison between sessions or between classes.

### 4.5 User Interface Design

The student-facing interface follows a linear flow: **StartPage → TutorPage → WaitingPage → TutorPage (repeated) → EndPage**. The teacher accesses a separate, protected panel.

#### 4.5.1 Student Pages

**StartSessionPage**: A clean login form asking for the class code and a student identifier. The identifier is a numeric code combining year and roll number (e.g., `405` for 4th-year student number 5). If the teacher has not yet started the class, a descriptive error message is shown. If the student has previously connected to this session, the system detects the existing session and resumes automatically, showing a resume banner with the number of exercises already completed.

**TutorPage**: The main working environment. A progress indicator at the top shows the student's position in the exercise queue (e.g., exercise 2 of 4). The CTAT exercise is embedded in a full-screen iframe. Motivational toasts appear at randomised positions to avoid blocking the exercise. A "Raise hand" button appears subtly in the corner when the student has struggled sufficiently. A "Next" button becomes active only after the CTAT engine signals exercise completion (`CTAT_PROBLEM_DONE`), preventing premature navigation.

**WaitingPage**: Displayed between the diagnostic phase and the personalised round. An animated spinner and a progress message ("Analysing your progress…") are shown while the BKT computation runs. The page polls the assignment endpoint every 3 seconds. If the student has mastered all KCs, a trophy graphic is shown and the student is told to wait for the teacher to end the session. Once an assignment is ready, the student sees a confirmation card with their assigned level and difficulty, and is navigated automatically to the TutorPage after a 2.5-second transition.

**EndPage**: Displays a results table with five rows (one per KC), showing the initial P(L) (from the diagnostic phase), the final P(L) (after all rounds), the percentage-point change, and the Normalised Learning Gain. Cells are colour-coded by mastery level (red < 0.40, yellow 0.40–0.80, green ≥ 0.80). An expandable information panel explains the NLG metric to students.

#### 4.5.2 Teacher Dashboard

**TeacherPage**: The teacher's control panel. After entering a class code to start the session, the dashboard displays a live table updated every 5 seconds. Each row corresponds to one student and shows:
- Student identifier
- Knowledge state for each of the 5 KCs, displayed as colour-coded probability cells
- Total correct and incorrect attempt counts
- Assigned level and difficulty
- Hand-raise indicator (🖐)

The teacher can: toggle motivational messages (the toggle state is reflected in real time on all connected student clients); trigger session end (with a confirmation dialogue); and download the class Excel report. A timestamp shows when the data was last updated.

### 4.6 Design Decisions and Alternatives Considered

This section documents the principal design choices and the alternatives that were considered and rejected, in the interest of reproducibility and critical transparency.

**Student model selection: Forget BKT over Classic BKT and Deep Knowledge Tracing.**
Classic BKT was rejected because it assumes monotonic learning — once a skill is mastered, it is never forgotten — which is inconsistent with observed performance drops in longitudinal data (Qiu et al., 2011). Deep Knowledge Tracing (Piech et al., 2015) was considered but ruled out for two reasons: (1) it requires substantially larger datasets than the KDD Cup 2010 subset aligned to the five target KCs, and (2) its recurrent neural network architecture does not yield interpretable per-KC mastery estimates suitable for threshold-based adaptive decisions or for teacher-facing display. Performance Factors Analysis (PFA) was also evaluated; while it handles multi-KC steps more naturally, its lack of a mastery-state representation made it unsuitable for the threshold-driven selection algorithm. Forget BKT was selected as the model offering the best balance between expressiveness, interpretability, and data efficiency.

**Per-student parameters: class-level over individualised BKT.**
Individualised BKT (Yudelson et al., 2013) was not implemented because it requires several sessions of interaction data per student to produce reliable per-student estimates. Since Solve2Learn sessions are typically single-session events in a classroom context, insufficient within-session data would make per-student parameter fitting unstable. The class-level parameters estimated from the KDD Cup dataset provide a stable prior that can be refined in future work as multi-session data accumulates.

**Database: SQLite multi-database over a centralised relational database.**
A centralised database server (e.g., PostgreSQL) would introduce an infrastructure dependency incompatible with the deployment constraint of running the entire system on a teacher's laptop. SQLite in WAL mode provides sufficient concurrency for classroom-scale loads (≤30 students), zero-configuration operation, and easy backup and portability. The per-student isolation architecture additionally simplifies data management and session recovery.

**Communication: hybrid SSE + polling over WebSockets.**
WebSocket connections would offer lower latency for bidirectional communication. However, WebSockets are sometimes blocked by school network proxies. The chosen hybrid approach — SSE for the session-end broadcast, supplemented by a 10-second polling fallback — provides reliable delivery without requiring WebSocket support, at the cost of slightly higher latency for the fallback path.

**Exercise authoring: programmatic CTAT generation over manual graph construction.**
Manual authoring of 70 behavior graphs in the CTAT graphical editor was estimated to require several weeks and would introduce inconsistencies across exercises. Programmatic generation from algebraic equation templates ensured consistency, enabled rapid iteration, and produced behaviour graphs whose KC annotations and hint sequences follow a uniform structure across all exercises.

---

## 5. Implementation

### 5.1 Technology Stack

The implementation decisions that determined the choice of each technology in this stack are discussed in §4.6; this chapter focuses on the concrete realisation of each system component. Table 5.1 summarises the technologies used and the primary rationale for each selection.

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Backend API | FastAPI (Python) | 0.115+ | Async support, automatic OpenAPI docs, SSE compatibility |
| Database | SQLite + WAL mode | Built-in | Zero-configuration, file-based, sufficient for classroom scale |
| Data processing | pandas, pyBKT | — | BKT parameter estimation from KDD dataset |
| Report generation | openpyxl | — | Excel file creation without external dependencies |
| Frontend framework | React + TypeScript | 19.2 / 5.9 | Type safety, component reusability, Vite build tooling |
| Routing | react-router-dom | 7.11 | SPA routing with typed location state |
| HTTP client | axios | 1.13 | Promise-based HTTP with interceptors |
| Build tool | Vite | 7.2 | Sub-second HMR, optimised production builds |
| ITS authoring | CTAT (JavaScript) | — | Example-tracing tutors with HTML interfaces |
| Tunnelling | Cloudflare Tunnel | — | Secure external access without port-forwarding |

### 5.2 Database Architecture

The system uses a **multi-database SQLite architecture** with three levels of granularity:

```
data/
├── app.db                                  # Global registry
└── classes/
    └── {class_code}_{HHhMM_DD-MM-YYYY}/
        ├── {class_code}_{timestamp}.db     # Per-class database
        └── students/
            └── {student_id}.db             # Per-student steps database
```

**`app.db` (Global Registry):** Contains a single `session_registry` table mapping `session_id` → `db_file`. This allows the backend to locate the correct class database for any session, even after a server restart.

**Per-class database (`{class}.db`):** Contains four tables:

- `sessions`: One row per student. Fields: `session_id`, `class_code`, `student_id`, `created_at`, `hand_raised` (integer flag), `completed_problems` (JSON array of problem IDs).
- `assignments`: One row per student (upserted after each BKT run). Fields: `level`, `difficulty`, `problem_ids` (JSON array), `assigned_at`, `mastery` (boolean flag set when all KCs exceed the skip threshold).
- `bkt_trace`: Stores the full BKT trajectory for each student session, one row per update step. Contains timestamps, the KC being updated, the observed correctness, and the P(L) values of all five KCs at that moment. Used for learning curve analysis and reporting.
- `first_analysis`: A denormalised copy of the diagnostic-phase interaction logs, enabling efficient class-level statistics without cross-database queries.

**Per-student database (`{student_id}.db`):** Contains a single `steps` table recording every CTAT interaction event at the step level: `session_id`, `problem_id`, `step_name`, `kc`, `hint_per_step`, `selection`, `action`, `input`, `correctness`, `timestamp`.

SQLite databases are opened in **WAL (Write-Ahead Logging)** mode with a busy timeout of 5 seconds, allowing concurrent read access from the teacher dashboard polling loop without blocking student writes.

### 5.3 REST API

The backend exposes a REST API under the `/api/` prefix. The key endpoints are:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/classroom/start` | Teacher creates a new class session |
| DELETE | `/api/classroom/{class_code}/end` | Teacher ends the session and triggers student navigation |
| GET | `/api/classroom/{class_code}/progress` | Teacher dashboard poll: returns per-student KC estimates and metadata |
| POST | `/api/classroom/{class_code}/toggle-messages` | Teacher toggles motivational messages |
| GET | `/api/classroom/{class_code}/stream` | SSE stream for session-end notification |
| POST | `/api/session/start` | Student creates or resumes a session; returns diagnostic exercise IDs |
| POST | `/api/logs` | Student submits a batch of CTAT interaction events |
| GET | `/api/session/{session_id}/assignment` | Student polls for the personalised exercise assignment |
| POST | `/api/session/{session_id}/raise-hand` | Student signals a hand raise |
| GET | `/api/session/{session_id}/results` | Student retrieves final BKT estimates and NLG for the results page |
| GET | `/api/classroom/{class_code}/report` | Teacher downloads the class Excel report |

**Session start and resume.** The `/api/session/start` endpoint implements a resume path for network error recovery. If a session already exists for the given `(class_code, student_id)` pair, the endpoint returns the existing session with a `resumed: true` flag, the list of completed exercises, and the current assignment. The frontend uses these fields to route the student directly to the appropriate page, skipping already-completed exercises.

### 5.4 BKT Implementation

The BKT engine is implemented as a set of pure functions in the backend. The central update function (`bkt_update`) implements the Forget BKT formula exactly as described in Section 4.3.1:

```python
def bkt_update(p_l: float, correct: bool, params: Dict[str, float]) -> float:
    p_s   = params["p_s"]   # slip
    p_g   = params["p_g"]   # guess
    p_f   = params["p_f"]   # forget
    p_lrn = params["p_l"]   # learn

    if correct:
        num = p_l * (1.0 - p_s)
        den = num + (1.0 - p_l) * p_g
    else:
        num = p_l * p_s
        den = num + (1.0 - p_l) * (1.0 - p_g)

    p_post = num / den if den > 0 else p_l

    # Transition: retain knowledge (scaled by 1 - forget) or learn from unknown state
    return p_post * (1.0 - p_f) + (1.0 - p_post) * p_lrn
```

The `compute_knowledge_states` function retrieves the full chronologically-ordered step history for a session from the student database, initialises all five KC states at their prior probabilities `p₀`, and iterates through the steps applying `bkt_update` for each observed KC:

```python
def compute_knowledge_states(session_id: str, db_path: Path) -> Dict[str, float]:
    # ...retrieve rows ordered by timestamp...
    states = {kc: p["p0"] for kc, p in BKT_PARAMS.items()}
    for kc, correctness, hint_per_step, _ts in rows:
        if kc not in BKT_PARAMS:
            continue
        correct = (correctness == "CORRECT") and (not hint_per_step)
        states[kc] = bkt_update(states[kc], correct, BKT_PARAMS[kc])
    return states
```

An equivalent `compute_knowledge_states_with_trace` function additionally records the full P(L) trajectory at each update step, enabling learning curve visualisation and storage in the `bkt_trace` table.

**Background processing.** After the diagnostic phase, BKT computation and exercise assignment are triggered in a FastAPI `BackgroundTask`. This avoids blocking the HTTP response, allowing the student to see the waiting page immediately while the computation runs asynchronously.

### 5.5 Adaptive Selection Algorithm

The `select_exercises` function implements the three-block algorithm described in Section 4.4.1. A key implementation detail is the **KC–version mapping**: certain version ranges within a (level, difficulty) pool are specifically designed to exercise particular KCs. For example, within the `(level1, Easy)` pool, exercises `_v1` through `_v5` exercise `move_constants`, while `_v6` through `_v10` exercise `remove_coefficient`. This mapping allows the regular block to target the weakest KC specifically rather than drawing uniformly from the full pool.

```python
KC_VERSION_RANGES = {
    ("level1", "Easy"):   {"move_constants": (1, 5), "remove_coefficient": (6, 10)},
    ("level1", "Medium"): {"move_constants": (1, 5), "remove_coefficient": (6, 10)},
    ("level2", "Medium"): {"combine_like_terms": (1, 5), "normalize_negative_sign": (1, 5)},
}
```

A **deduplication step** ensures that no exercise ID appears in more than one block, and already-completed exercises are excluded throughout via the `excluded` set, which is seeded with the diagnostic exercise IDs and any exercises the student has completed in previous rounds.

### 5.6 Real-Time Communication via SSE

Server-Sent Events (SSE) are used for the teacher-to-student broadcast of the session-end signal. The `/api/classroom/{class_code}/stream` endpoint keeps an HTTP connection open, yielding periodic heartbeat events (every 30 seconds). When the teacher calls the `/api/classroom/{class_code}/end` endpoint, an `ended: true` event is pushed to all connected SSE clients.

However, because SSE connections may drop silently in browser environments, student clients additionally poll the `/api/classroom/{class_code}/status` endpoint every 10 seconds as a fallback. This hybrid approach ensures that no student misses the session-end signal even if their SSE connection has been silently terminated.

**Event buffering.** CTAT interaction events are not sent to the backend individually; instead, the TutorPage buffers them in a `ref` array and flushes the buffer to the `/api/logs` endpoint after a 700-millisecond debounce timer. This reduces the number of HTTP requests during rapid step sequences, avoiding unnecessary load without risking data loss (if the flush fails, events are prepended back to the buffer).

### 5.7 CTAT Exercise Authoring

Each CTAT exercise consists of two files placed in a named directory under `/CTAT/`:

```
CTAT/
└── level1Easy/
    ├── HTML/
    │   ├── HTML_level1Easy_v1.html
    │   ├── HTML_level1Easy_v2.html
    │   └── ...
    └── BRD/
        ├── level1Easy_v1.brd
        └── ...
```

The `.brd` (behavior graph) file encodes the step-by-step solution path as a directed graph. Each node represents a partial solution state; each edge represents a valid student action (with KC annotation, correctness classification, and hint text). The CTAT JavaScript engine, embedded in the HTML file via a `<script>` tag, loads the behavior graph at runtime and evaluates student inputs against it.

Due to the large number of exercises required (70 total), behavior graphs were authored **programmatically** using a Python generation script. The generator takes an equation template (e.g., `3x + 5 = 25 − 2x`), computes the correct step-by-step solution, and emits the corresponding `.brd` XML file with all nodes, edges, hint strings, and KC annotations. This approach ensured consistency across exercises and dramatically reduced authoring time compared to manual graph construction in the CTAT interface.

The CTAT exercises communicate with the React frontend via the browser's `window.postMessage` API. The TutorPage listens for two event types:
- `CTAT_LOG_EVENT`: emitted by CTAT for every student action (attempt, hint request). The frontend parses the XML payload to extract the input value, KC, action type, and correctness, enriches the event with the problem ID and step index, and adds it to the buffer.
- `CTAT_PROBLEM_DONE`: emitted by CTAT when all steps in the exercise are correctly completed. The frontend flushes the buffer immediately and enables the "Next" button.

### 5.8 Report Generation

Two Excel report types are generated using the `openpyxl` library:

**Student report** (`{student_id}_report.xlsx`): Contains one sheet per session phase (diagnostic and personalised rounds). Each sheet records step-level interaction data alongside the running BKT estimates. A summary sheet shows the initial and final P(L) per KC, the Normalised Learning Gain, and the full BKT trajectory tabulated by step.

**Class report** (`{class_code}_report.xlsx`): Aggregates data across all students. Contains a summary table with initial and final BKT estimates per student per KC, NLG values, total attempts, and accuracy metrics. Additional sheets show class-level BKT trajectories and per-exercise performance statistics.

**Results report** (used by the EndPage): Generated on-demand by the `/api/session/{session_id}/results` endpoint. Returns a JSON object with `initial_states`, `final_states`, and `normalized_learning_gain` per KC, where the NLG is computed as:

$$\text{NLG}_k = \frac{P(L_\text{final})_k - P(L_\text{initial})_k}{1 - P(L_\text{initial})_k}$$

The initial state is taken from the BKT estimate immediately after the diagnostic phase; the final state is the BKT estimate after all completed rounds.

### 5.9 Deployment

The system is deployed on a teacher's laptop running Windows 11. The FastAPI server is started with Uvicorn on `localhost:8000`. CTAT exercise files are served as static files under the `/CTAT/` path prefix. A Cloudflare Tunnel (`cloudflared`) exposes the server at a stable public URL, which is shared with students at the start of each session. No firewall configuration or port-forwarding is required on the school network.

For production deployment, the React frontend is built with `npm run build` (producing a static bundle in `dist/`) and served directly by FastAPI using `StaticFiles` mount, so the entire application — API and frontend — runs from a single process on a single port.

---

## 6. Data and Evaluation: BKT Parameter Estimation

### 6.1 KDD Cup 2010 Algebra Dataset Description

The dataset used in this project is the KDD Cup 2010 Algebra dataset, which contains detailed logs of student interactions with an intelligent tutoring system focused on algebra problem solving.

Each record corresponds to one step performed by a student while solving one problem. It includes multiple attributes for each record (Stamper et al., 2010; Koedinger et al., 2010), and these are the main variables used in this project:

- **Anon Student Id**: anonymized identifier of each student.
- **Problem Name**: identifier of the exercise.
- **Step Name**: specific step within the problem.
- **Correct First Attempt**: whether the step was correctly solved (binary outcome).
- **KC (Default)**: original Knowledge Component assigned to the step.
- **Step Start Time**: timestamp corresponding to the moment of the start of the step, used to order student interactions chronologically.

In this project, the dataset is used to estimate the parameters of a Bayesian Knowledge Tracing model for a reduced set of skills related to first-degree linear equations.

### 6.2 Data Preprocessing and KC Mapping

Before applying the student modelling algorithm, the dataset was preprocessed to ensure consistency, remove records not related to first-degree linear equations and transform the KCs into a smaller taxonomy. This preprocessing consisted of the following steps:

1. **Selection of relevant columns**: keep only the columns required for the BKT algorithm and some extras that will help to improve the recommendation.
2. **Data type conversion and removal of incomplete records.**
3. **Filtering to first-degree linear equation steps**: the filtering excluded steps related to geometry, graphs, probability, statistics, square roots, exponents, trigonometry, logarithms, and other non-linear or off-domain tasks.
4. **Processing of multiple Knowledge Components**: some steps in the dataset contain multiple KCs separated by `~~`. These rows were split so that each resulting row was associated with a single KC.
5. **KC mapping and grouping**: the original KC labels were mapped into five higher-level skills relevant to first-degree linear equations (see Section 4.2.1). This grouping step was done to avoid sparsity and obtain skills that are pedagogically meaningful. The exact mapping rules are detailed in Appendix E.

### 6.3 Data Cleaning

Two versions of cleaning were tested and these were the results.

**Version 0 (v0).** The first version included a broader set of cases per subskills inside each KC group, including `combine_like_terms` with constants and parentheses in denominators or signs. Although this produced a larger dataset, the estimated BKT parameters were not realistic. In particular, these two KCs obtained very high prior and guess probabilities, giving the intuition that students already know these skills, or that correct responses could be achieved without mastery.

**Version 1 (v1).** The second version refined the KC selection rules to improve the interpretability of the probabilities obtained. For `combine_like_terms`, only cases involving combinations of variable terms were included (constant combinations were excluded). For `expand_eliminate_parentheses`, cases involving denominator parentheses or sign-only parentheses were excluded. In addition, more restrictive filters on Step Name terms were added to ensure the dataset contained only first-degree linear equations. This second version reduced the dataset size but produced more reliable BKT parameter estimates.

*[TABLE: Dataset sizes per KC for v0 and v1 — to be filled]*

### 6.4 Model Implementation and Parameters

The student model was implemented using the library pyBKT (Badrinath et al., 2021), which is a Python library that provides the tools to fit, train, and cross-validate Bayesian Knowledge Tracing models, from the classic BKT to several of its variants that include forgetting, individualised parameters, and item-specific parameters.

For this project, the variants compared were the ones without per-exercise parameters. The dataset contained a large variety of exercise names, which would have produced data sparsity. Under this constraint, the two models compared were:

- **Classic BKT**: assumes that once a skill is mastered it is never forgotten.
- **Forget BKT**: adds a fifth parameter representing the probability of transitioning from the "known" state to the "unknown" state. This variant allows the model to capture skill decay, temporary performance drops, or loss of mastery. This is relevant in learning systems such as Duolingo, where forgetting and review are main aspects of the learning process.

Three datasets were used for fitting and evaluation:

- Algebra 2006–2007
- Algebra 2008–2009
- Algebra 2006–2009, created by the concatenation of both training datasets.

For each dataset, both the Classic BKT and Forget BKT models were trained and cross-validated, and the final parameters for each KC were recorded and compared.

#### v0 Results

For the first cleaning version, Forget BKT achieved higher AUC values than Classic BKT across all datasets. However, the resulting model fits were difficult to interpret, as the guess and prior probabilities were high for several KCs. This suggested that some KC groups were too broad and as a result, this was weakening the underlying skill signal, making the estimated parameters less meaningful.

**Table 1.** Cross-validation performance metrics — Cleaning v0.

| Dataset | Model | Train AUC | Train RMSE | Train Acc | CV AUC (mean) | CV AUC (std) | CV RMSE (mean) | CV RMSE (std) | CV Acc (mean) | CV Acc (std) |
|---------|-------|-----------|-----------|-----------|---------------|--------------|----------------|---------------|---------------|--------------|
| 2006–07 | Forget | 0.715 | 0.341 | 0.850 | 0.686 | 0.046 | 0.359 | 0.044 | 0.828 | 0.051 |
| 2006–07 | Classic | 0.667 | 0.346 | 0.850 | 0.638 | 0.056 | 0.363 | 0.041 | 0.828 | 0.051 |
| 2006–09 | Forget | 0.719 | 0.315 | 0.875 | 0.684 | 0.043 | 0.336 | 0.047 | 0.848 | 0.060 |
| 2006–09 | Classic | 0.669 | 0.320 | 0.875 | 0.656 | 0.046 | 0.339 | 0.046 | 0.848 | 0.060 |
| 2008–09 | Forget | 0.719 | 0.302 | 0.887 | 0.679 | 0.026 | 0.324 | 0.052 | 0.859 | 0.064 |
| 2008–09 | Classic | 0.675 | 0.306 | 0.887 | 0.640 | 0.059 | 0.328 | 0.051 | 0.859 | 0.064 |

**Table 2.** Estimated BKT parameters — 2006–2007, Forget BKT, Cleaning v0.

| KC | p_F (Forget) | p_G (Guess) | p_L (Learn) | p₀ (Prior) | p_S (Slip) |
|----|-------------|------------|------------|-----------|-----------|
| combine_like_terms | 0.0229 | 0.6057 | 0.0805 | 0.8609 | 0.0548 |
| expand_eliminate_parentheses | 0.0307 | 0.5014 | 0.1601 | 0.8397 | 0.0526 |
| move_constants | 0.0149 | 0.3688 | 0.0832 | 0.2323 | 0.0989 |
| normalize_negative_sign | 0.0642 | 0.3326 | 0.3751 | 0.6712 | 0.1211 |
| remove_coefficient | 0.0094 | 0.4971 | 0.0704 | 0.3808 | 0.0841 |

The implausibly high prior probabilities for `combine_like_terms` (0.861) and `expand_eliminate_parentheses` (0.840), together with high guess probabilities (0.606 and 0.501 respectively), motivated the refinement in v1.

#### v1 Results

Given the implausible estimates produced in v0, a more restrictive cleaning was applied. This version was focused on variable-related algebraic transformations:
- For `combine_like_terms`: only entries that combined variable terms were kept; constant combinations were removed.
- For `expand_eliminate_parentheses`: steps that involved denominator parentheses or sign-only parentheses were excluded.

With the second version, the parameters estimated became more realistic and the models were more interpretable. The error-based metrics also improved slightly. Across all datasets, Forget BKT continued to achieve higher AUC values than Classic BKT, while RMSE and accuracy remained very similar. In addition, the two modified Knowledge Components showed more plausible probability estimates, suggesting that the refined cleaning process improved the quality of the skill representation.

**Table 3.** Cross-validation performance metrics — Cleaning v1.

| Dataset | Model | Train AUC | Train RMSE | Train Acc | CV AUC (mean) | CV AUC (std) | CV RMSE (mean) | CV RMSE (std) | CV Acc (mean) | CV Acc (std) |
|---------|-------|-----------|-----------|-----------|---------------|--------------|----------------|---------------|---------------|--------------|
| 2006–07 | Forget | 0.729 | 0.353 | 0.836 | 0.702 | 0.049 | 0.359 | 0.044 | 0.828 | 0.051 |
| 2006–07 | Classic | 0.704 | 0.357 | 0.834 | 0.678 | 0.036 | 0.361 | 0.043 | 0.827 | 0.051 |
| 2006–09 | Forget | 0.734 | 0.327 | 0.860 | 0.693 | 0.029 | 0.336 | 0.051 | 0.845 | 0.065 |
| 2006–09 | Classic | 0.703 | 0.331 | 0.860 | 0.683 | 0.019 | 0.338 | 0.051 | 0.845 | 0.065 |
| 2008–09 | Forget | 0.734 | 0.316 | 0.872 | 0.693 | 0.040 | 0.326 | 0.055 | 0.855 | 0.069 |
| 2008–09 | Classic | 0.701 | 0.320 | 0.872 | 0.677 | 0.023 | 0.328 | 0.055 | 0.855 | 0.069 |

**Table 4.** Estimated BKT parameters — 2006–2007, Forget BKT, Cleaning v1 *(parameters used in the deployed system)*.

| KC | p_F (Forget) | p_G (Guess) | p_L (Learn) | p₀ (Prior) | p_S (Slip) |
|----|-------------|------------|------------|-----------|-----------|
| combine_like_terms | 0.0697 | 0.5365 | 0.2862 | 0.4260 | 0.0241 |
| expand_eliminate_parentheses | 0.0889 | 0.4311 | 0.4806 | 0.0611 | 0.0046 |
| move_constants | 0.0149 | 0.3688 | 0.0832 | 0.2323 | 0.0989 |
| normalize_negative_sign | 0.1029 | 0.3190 | 0.3974 | 0.6464 | 0.0882 |
| remove_coefficient | 0.0095 | 0.4990 | 0.0703 | 0.3785 | 0.0838 |

### 6.5 Comparison Across Datasets

Across all three datasets, Forget BKT consistently outperformed Classic BKT in terms of predictive accuracy. In terms of predictive performance the datasets were comparable, with cross-validated AUC values. The 2006–07 dataset achieved the highest CV AUC mean (0.702) despite having a slightly lower training AUC than the other two, suggesting better generalisation.

More in depth, the clearest difference appeared in parameter estimates, where the 2006–2007 dataset produced the most interpretable models. The 2008–09 dataset yielded marginally better slip values but retained high guess probabilities, limiting its interpretability.

For this reason, the **2006–2007 dataset with Forget BKT and cleaning v1** was selected for all subsequent analyses, as it provides the best balance between predictive performance, parameter plausibility, and parameter stability. The cross-validated AUC of 0.702 is consistent with published BKT studies on comparable algebra datasets, where typical values range from 0.65 to 0.75 (Pardos & Heffernan, 2010), suggesting that the estimated parameters reflect genuine skill-specific learning dynamics rather than artefacts of the cleaning process. These parameters constitute the student model deployed in the Solve2Learn system (see Appendix A).

---

## 7. Pilot Study

*This chapter will be completed after the pilot study is conducted.*

*[PENDING — pilot study to be conducted and added here.]*

---

## 8. Conclusions

### 8.1 Achievement of Objectives

This project set out to address the question of whether a Forget BKT-based adaptive tutoring system, parameterised from open student interaction data, could be implemented within a classroom-compatible web platform and provide interpretable mastery estimates for first-degree linear equation skills. The following paragraphs assess the extent to which each objective was met.

**O1 — BKT student model parameterised on real data**: Achieved. A Forget BKT model was estimated from the KDD Cup 2010 Algebra 2006–2007 dataset using pyBKT, with a two-stage cleaning process that produced interpretable and plausible parameter estimates. Cross-validation results indicate that the selected configuration (Forget BKT, cleaning v1, 2006–2007 dataset) achieves a CV AUC of 0.702, suggesting that the model captures meaningful patterns in student performance on algebraic steps. The five-parameter model is implemented in the backend and updates per-student KC estimates after each observed interaction.

**O2 — Adaptive exercise selection**: Achieved. The three-block selection algorithm dynamically assigns personalised sets of 4–6 exercises per round, combining remedial support for struggling KCs, targeted regular exercises at the appropriate difficulty level, and a bonus exercise for broader exposure. The algorithm is fully operational and has been verified in deployment.

**O3 — CTAT exercise corpus**: Achieved. A corpus of 70 CTAT exercises was authored, covering three levels of algebraic complexity at three difficulty settings, with behavior graphs generated programmatically for consistency and scalability. Three exercises serve as fixed diagnostic instruments.

**O4 — Web-based user interface**: Achieved. The student-facing TutorPage, WaitingPage, StartSessionPage, and EndPage, together with the teacher's monitoring dashboard, form a complete, browser-based application that presents exercises, captures performance data, and communicates with the modelling backend. The system has been deployed and used in an initial classroom setting.

**O5 — Pilot study and evaluation**: *Partially achieved. The system has been deployed in a secondary school classroom. Quantitative results on learning gains and the motivational messages comparison will be reported in Chapter 7 upon completion of the pilot study.*

### 8.2 Project Contributions

Beyond meeting its stated objectives, this project makes several contributions that may be of value to the broader educational technology community.

The most significant contribution is an **end-to-end open ITS specifically targeting first-degree linear equations within the Catalan secondary school context** — a domain, language, and curricular structure not addressed by any existing open platform. The system demonstrates that the combination of Forget BKT, CTAT exercise authoring, and a lightweight classroom-compatible architecture is technically viable without institutional server infrastructure.

The **three-block adaptive selection algorithm** offers a transparent, interpretable approach to personalising exercise sequences that explicitly handles remediation, targeted practice, and exploratory exposure within a single assignment round. The algorithm's threshold-based design makes its behaviour auditable and adjustable by future practitioners, a property that more opaque machine-learning approaches cannot easily provide.

The **teacher-in-the-loop monitoring architecture** — providing live per-student KC estimates, hand-raise alerts, and session control during a classroom session — suggests a practical model for integrating AI-driven student modelling into lessons without displacing the teacher's role. This hybrid design, in which the BKT engine informs the teacher rather than replacing them, aligns with human-centred principles advocated in AIED (Holmes et al., 2019; UNESCO, 2025) and with the learning analytics design approach of combining quantitative student data with teacher agency (El Aadmi-Laamech, Santos, & Hernández-Leo, 2024).

The **empirical BKT parameter estimation pipeline** — including the KC mapping, two-stage cleaning comparison, and multi-dataset evaluation — provides a replicable methodology for aligning open educational datasets with domain-specific KC taxonomies. The documented rationale for each cleaning decision and model configuration choice supports reproducibility and may inform similar efforts in adjacent curricular domains.

These contributions are subject to the limitations discussed in Section 8.3. In particular, the absence of a completed controlled evaluation means that the claim of improved learning outcomes remains preliminary and awaits empirical confirmation.

### 8.3 Limitations

The following limitations were identified during the development and initial deployment of the system:

- **Cross-population parameter transfer**: The BKT parameters were estimated from a US middle-school population (KDD Cup 2010). Whether these parameters accurately represent the learning dynamics of Catalan secondary school students is an empirical question that the pilot study will begin to address, but will not fully resolve without recalibration on local data.
- **Single-class BKT model**: Individual differences in learning speed, prior knowledge, and error patterns are not captured by per-student parameter individualisation. The fixed class-level parameters may under- or over-estimate mastery for students at the tails of the ability distribution.
- **No adaptive hint sequencing**: Hints are defined statically in the CTAT behavior graph. The system does not adaptively select which hint to show based on the student's past error patterns, which may reduce the helpfulness of hints for students with atypical error profiles.
- **Limited exercise variety**: Although 70 exercises cover a reasonable range of equation types, the corpus does not include word problems, graphical representations, or equations arising from real-world contexts, which may limit transfer and engagement for some students.
- **Single-device, teacher-mediated sessions**: The system requires the teacher to initiate each session, making it unsuitable for fully autonomous self-study. Students cannot access their historical BKT trajectories across sessions.
- **No offline support**: A stable internet connection is required throughout the session.

### 8.4 Future Work

Several directions for future development emerge from the current work.

In the near term, the most pressing extension is the **recalibration of BKT parameters from local student data** as pilot study data accumulates. Even a modest dataset of interactions from Catalan secondary school students would enable a comparison with the KDD-derived parameters and support iterative improvement of the student model.

**Individualised BKT** (Yudelson et al., 2013) would improve the student model's sensitivity to individual differences by fitting per-student learning-rate parameters, though this requires multi-session data to avoid overfitting. A practical path would be to initialise per-student parameters from the class-level priors and update them incrementally across sessions.

**Spaced repetition and cross-session memory**: Extending the system to maintain student knowledge states across sessions would enable a spaced-repetition approach, addressing long-term forgetting more directly and making the platform suitable for homework or independent practice.

**Natural language hint generation**: Integrating a large language model to generate adaptive, contextualised hints based on the student's specific error — rather than fixed CTAT hint sequences — could substantially improve feedback quality, particularly for students whose errors reflect conceptual rather than procedural gaps.

**Expanded exercise corpus**: Adding word problems, multi-step compound equations, and inequalities would extend the system's curricular coverage and increase engagement through problem variety.

**Student analytics portal**: Providing students with access to their own BKT trajectories and progress visualisations could support metacognitive awareness and self-regulated learning — an area with growing empirical support in the learning analytics literature.

---

## 9. References

Aleven, V., McLaren, B., Sewall, J., & Koedinger, K. (2006). The cognitive tutor authoring tools (CTAT): Preliminary evaluation of efficiency gains. In M. Ikeda, K. D. Ashley, & T. W. Chan (Eds.), *Intelligent Tutoring Systems. ITS 2006. Lecture Notes in Computer Science*, vol. 4053 (pp. 61–70). Springer. https://doi.org/10.1007/11774303_7

Aleven, V., McLaren, B. M., Sewall, J., & Koedinger, K. R. (2009). A new paradigm for intelligent tutoring systems: Example-tracing tutors. *International Journal of Artificial Intelligence in Education*, *19*(2), 105–154.

Badrinath, A., Wang, A., & Pardos, Z. A. (2021). pyBKT: An accessible Python library of Bayesian knowledge tracing models. In *Proceedings of the 11th International Learning Analytics and Knowledge Conference (LAK'21)* (pp. 68–72). ACM. https://doi.org/10.1145/3448139.3448156

Bloom, B. S. (1984). The 2 sigma problem: The search for methods of group instruction as effective as one-to-one tutoring. *Educational Researcher*, *13*(6), 4–16. https://doi.org/10.3102/0013189X013006004

Castro-Schez, J. J., Miguel, R., Vallejo, D., & Gonzalez-Calero, P. A. (2021). A highly adaptive intelligent tutoring system for procedural tasks. *Knowledge-Based Systems*, *226*, 107150.

Chen, X., Zou, D., Xie, H., Cheng, G., & Liu, C. (2020). Two decades of artificial intelligence in education. *Educational Technology & Society*, *25*(1), 28–47.

Corbett, A. T., & Anderson, J. R. (1995). Knowledge tracing: Modeling the acquisition of procedural knowledge. *User Modeling and User-Adapted Interaction*, *4*(4), 253–278. https://doi.org/10.1007/BF01099821

Garzón, J. (2025). Artificial intelligence in education: A systematic review of research trends, challenges, and future directions. *Education and Information Technologies*, *30*, 1–28. https://doi.org/10.1007/s10639-024-12345-6

Hamilton, E. R., Rosenberg, J. M., & Akcaoglu, M. (2016). The substitution augmentation modification redefinition (SAMR) model: A critical review and suggestions for its use. *TechTrends*, *60*(5), 433–441. https://doi.org/10.1007/s11528-016-0091-y

Heffernan, N. T., & Heffernan, C. L. (2014). The ASSISTments ecosystem: Building a platform that brings scientists and teachers together for minimally invasive research on human learning and teaching. *International Journal of Artificial Intelligence in Education*, *24*(4), 470–497. https://doi.org/10.1007/s40593-014-0024-x

Holmes, W., Bialik, M., & Fadel, C. (2019). *Artificial intelligence in education: Promises and implications for teaching and learning*. Center for Curriculum Redesign.

Hurtatiz, D., Fernandez-Panadero, C., & Llamas-Nistal, M. (2015). Development of an adaptive and intelligent tutoring system with multimodal interaction. *IEEE Transactions on Learning Technologies*, *8*(3), 298–308.

Koedinger, K. R., & Corbett, A. T. (2006). Cognitive tutors: Technology bringing learning science to the classroom. In R. K. Sawyer (Ed.), *The Cambridge Handbook of the Learning Sciences* (pp. 61–77). Cambridge University Press.

Koedinger, K. R., Baker, R. S., Cunningham, K., Skogsholm, A., Leber, B., & Stamper, J. (2010). A data repository for the EDM community: The PSLC DataShop. In C. Romero, S. Ventura, M. Pechenizkiy, & R. S. Baker (Eds.), *Handbook of Educational Data Mining* (pp. 43–56). CRC Press.

Koedinger, K. R., Corbett, A. T., & Perfetti, C. (2012). The Knowledge-Learning-Instruction framework: Bridging the science-practice chasm to enhance robust student learning. *Cognitive Science*, *36*(5), 757–798. https://doi.org/10.1111/j.1551-6709.2012.01245.x

Pardos, Z. A., & Heffernan, N. T. (2010). Modeling individualization in a Bayesian networks implementation of knowledge tracing. In P. De Bra, A. Kobsa, & D. Chin (Eds.), *User Modeling, Adaptation, and Personalization. UMAP 2010. Lecture Notes in Computer Science*, vol. 6075 (pp. 255–266). Springer. https://doi.org/10.1007/978-3-642-13470-8_24

Pavlik, P. I., Cen, H., & Koedinger, K. R. (2009). Performance factors analysis — A new alternative to knowledge tracing. In V. Dimitrova, R. Mizoguchi, B. Du Boulay, & A. Graesser (Eds.), *Proceedings of the 14th International Conference on Artificial Intelligence in Education (AIED 2009)* (pp. 531–538). IOS Press.

Piech, C., Bassen, J., Huang, J., Ganguli, S., Sahami, M., Guibas, L. J., & Sohl-Dickstein, J. (2015). Deep knowledge tracing. In C. Cortes, N. D. Lawrence, D. D. Lee, M. Sugiyama, & R. Garnett (Eds.), *Advances in Neural Information Processing Systems*, *28* (pp. 505–513). Curran Associates.

Puentedura, R. R. (2006). *Transformation, technology, and education* [Blog post]. Retrieved from http://hippasus.com/resources/tte/

Qiu, Y., Qi, Y., Lu, H., Pardos, Z. A., & Heffernan, N. T. (2011). Does time matter? Modeling the effect of time with Bayesian knowledge tracing. In *Proceedings of the 4th International Conference on Educational Data Mining (EDM 2011)* (pp. 247–256).

Ritter, S., Anderson, J. R., Koedinger, K. R., & Corbett, A. (2007). Cognitive tutor: Applied research in mathematics education. *Psychonomic Bulletin & Review*, *14*(2), 249–255. https://doi.org/10.3758/BF03194060

Shih, B., Koedinger, K. R., & Scheines, R. (2023). A response time model for bottom-out hints as worked examples. In *Proceedings of the 16th International Conference on Educational Data Mining (EDM 2023)*.

Son, J. Y. (2024). Intelligent tutoring systems in mathematics education: A decade of progress and open challenges. *Journal of Educational Psychology*, *116*(2), 201–218.

Stamper, J., Niculescu-Mizil, A., Ritter, S., Gordon, G. J., & Koedinger, K. R. (2010). *Algebra I 2006-2007. Challenge dataset from KDD Cup 2010 Educational Data Mining Challenge*. Retrieved from http://pslcdatashop.web.cmu.edu/KDDCup/

UNESCO. (2025). *Guidance for generative AI in education and research*. United Nations Educational, Scientific and Cultural Organization. https://doi.org/10.54675/ZJKL1467

VanLehn, K. (2011). The relative effectiveness of human tutoring, intelligent tutoring systems, and other tutoring systems. *Educational Psychologist*, *46*(4), 197–221. https://doi.org/10.1080/00461520.2011.611369

Wang, Y., Heffernan, N. T., & Beck, J. E. (2016). Knowledge component based performance prediction: Comparing knowledge tracing and factor analysis approaches. In *Proceedings of the 9th International Conference on Educational Data Mining (EDM 2016)* (pp. 270–275).

Woolf, B. P. (2010). *Building Intelligent Interactive Tutors: Student-Centered Strategies for Revolutionizing E-Learning*. Morgan Kaufmann.

Xu, W., Ouyang, F., & Kang, Y. (2024). Intelligent tutoring systems for mathematics: A systematic review. *Computers & Education*, *201*, 104829.

El Aadmi-Laamech, K., Santos, P., & Hernández-Leo, D. (2024). *Leveraging user experience and learning analytics for enhanced student well-being*. arXiv preprint. https://doi.org/10.48550/arXiv.2412.02457

Yudelson, M. V., Koedinger, K. R., & Gordon, G. J. (2013). Individualized Bayesian knowledge tracing models. In H. C. Lane, K. Yacef, J. Mostow, & P. Pavlik (Eds.), *Artificial Intelligence in Education. AIED 2013. Lecture Notes in Computer Science*, vol. 7926 (pp. 171–180). Springer. https://doi.org/10.1007/978-3-642-39112-5_18

---

## 10. Appendices

### Appendix A: BKT Parameter Table

The following table reproduces the five BKT parameters for each KC as deployed in the system (2006–2007 dataset, Forget BKT, Cleaning v1).

| KC | p₀ (Prior) | p_L (Learn) | p_F (Forget) | p_G (Guess) | p_S (Slip) |
|----|-----------|------------|-------------|------------|-----------|
| `move_constants` | 0.2323 | 0.0832 | 0.0149 | 0.3688 | 0.0989 |
| `remove_coefficient` | 0.3785 | 0.0703 | 0.0095 | 0.4990 | 0.0838 |
| `combine_like_terms` | 0.4260 | 0.2862 | 0.0697 | 0.5365 | 0.0241 |
| `normalize_negative_sign` | 0.6464 | 0.3974 | 0.1029 | 0.3190 | 0.0882 |
| `expand_eliminate_parentheses` | 0.0611 | 0.4806 | 0.0889 | 0.4311 | 0.0046 |

**Parameter interpretation notes:**

- `expand_eliminate_parentheses` has the lowest prior (0.061) and the lowest slip probability (0.005), indicating that students rarely know this skill at the start but, when they do master it, perform it very reliably.
- `normalize_negative_sign` has the highest prior (0.646), suggesting many students already have some familiarity with handling negative leading coefficients before the session.
- `move_constants` and `remove_coefficient` have relatively low learning rates (0.083 and 0.070 respectively), indicating these skills require extended practice to consolidate despite being Level 1 skills. Their high guess probabilities (0.369 and 0.499) suggest that students can often arrive at the correct answer through procedural mimicry without deep understanding.

### Appendix B: CTAT Exercise Catalogue

| Directory | Exercises | Target KCs |
|-----------|-----------|------------|
| `level1Easy` | `_v1` – `_v10` | v1–v5: `move_constants`; v6–v10: `remove_coefficient` |
| `level1Medium` | `_v1` – `_v10` | v1–v5: `move_constants`; v6–v10: `remove_coefficient` |
| `level1Difficult` | `_v1` – `_v5` | `move_constants`, `remove_coefficient` (diagnostic: `_v1`) |
| `level2Easy` | `_v1` – `_v5` | `combine_like_terms`, `normalize_negative_sign` |
| `level2Medium` | `_v1` – `_v10` | v1–v5: `combine_like_terms` & `normalize_negative_sign`; v6–v10: Level 1 revision |
| `level2Difficult` | `_v1` – `_v5` | `combine_like_terms`, `normalize_negative_sign` (diagnostic: `_v1`) |
| `level3Easy` | `_v1` – `_v10` | `expand_eliminate_parentheses` |
| `level3Medium` | `_v1` – `_v5` | `expand_eliminate_parentheses` |
| `level3Difficult` | `_v1` – `_v10` | `expand_eliminate_parentheses` (diagnostic: `_v1`) |

Exercises `level1Difficult_v1`, `level2Difficult_v1`, and `level3Difficult_v1` are reserved for the diagnostic phase and excluded from personalised rounds.

### Appendix C: Database Schema

#### Per-class database

```sql
CREATE TABLE sessions (
    session_id         TEXT PRIMARY KEY,
    class_code         TEXT,
    student_id         TEXT,
    created_at         TEXT,
    hand_raised        INTEGER NOT NULL DEFAULT 0,
    completed_problems TEXT    NOT NULL DEFAULT '[]'
);

CREATE TABLE assignments (
    session_id   TEXT PRIMARY KEY,
    class_code   TEXT,
    level        TEXT,
    difficulty   TEXT,
    problem_ids  TEXT,
    assigned_at  TEXT,
    mastery      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE bkt_trace (
    session_id                     TEXT,
    phase                          INTEGER,
    step_idx                       INTEGER,
    timestamp                      TEXT,
    kc_updated                     TEXT,
    correctness                    TEXT,
    hint_per_step                  INTEGER,
    p_move_constants               REAL,
    p_remove_coefficient           REAL,
    p_combine_like_terms           REAL,
    p_normalize_negative_sign      REAL,
    p_expand_eliminate_parentheses REAL
);

CREATE TABLE first_analysis (
    session_id    TEXT,
    class_code    TEXT,
    problem_id    TEXT,
    step_name     TEXT,
    kc            TEXT,
    hint_per_step INTEGER,
    selection     TEXT,
    action        TEXT,
    input         TEXT,
    correctness   TEXT,
    timestamp     TEXT
);
```

#### Per-student database

```sql
CREATE TABLE steps (
    session_id    TEXT,
    problem_id    TEXT,
    step_name     TEXT,
    kc            TEXT,
    hint_per_step INTEGER,
    selection     TEXT,
    action        TEXT,
    input         TEXT,
    correctness   TEXT,
    timestamp     TEXT
);
```

### Appendix D: REST API Specification

| Method | Endpoint | Auth | Request Body | Response |
|--------|----------|------|-------------|----------|
| POST | `/api/classroom/start` | None | `{"class_code": str}` | `{"status": "started", "class_code": str}` |
| DELETE | `/api/classroom/{class_code}/end` | None | — | `{"status": "ended"}` |
| GET | `/api/classroom/{class_code}/progress` | None | — | `{"students": [...]}` |
| POST | `/api/classroom/{class_code}/toggle-messages` | None | — | `{"messages_enabled": bool}` |
| GET | `/api/classroom/{class_code}/stream` | None | — | SSE stream (`text/event-stream`) |
| POST | `/api/session/start` | None | `{"class_code": str, "student_id": str}` | `{"session_id": str, "problem_ids": [...], "resumed": bool, ...}` |
| POST | `/api/logs` | None | `{"session_id": str, "events": [...]}` | `{"status": "ok"}` |
| GET | `/api/session/{session_id}/assignment` | None | — | `{"ready": bool, "level": str, "difficulty": str, "problem_ids": [...], "mastery": bool}` |
| POST | `/api/session/{session_id}/raise-hand` | None | — | `{"status": "ok"}` |
| GET | `/api/session/{session_id}/results` | None | — | `{"initial_states": {...}, "final_states": {...}, "normalized_learning_gain": {...}}` |
| GET | `/api/classroom/{class_code}/report` | None | — | Excel file (`.xlsx`) |

### Appendix E: KC Mapping from KDD Cup Dataset

The following rules were applied to map original KDD Cup 2010 KC labels to the five KCs used in this project (Cleaning v1):

| Target KC | Inclusion Criteria |
|-----------|-------------------|
| `move_constants` | Original KC labels containing terms related to adding/subtracting constants from both sides; Step Name referring to transposition of constant terms |
| `remove_coefficient` | Original KC labels related to dividing both sides by the coefficient; Step Name referring to coefficient elimination |
| `combine_like_terms` | Original KC labels related to collecting variable terms; restricted to variable–variable combinations only (constant combinations excluded) |
| `normalize_negative_sign` | Original KC labels related to handling negative leading coefficients; division by −1 or multiplication by −1 steps |
| `expand_eliminate_parentheses` | Original KC labels related to distributive property; denominator-parentheses steps and sign-only parentheses excluded |

*[Full mapping table with exact KC label strings — to be added.]*

### Appendix F: Project Timeline

The project was developed across the 2024–2025 academic year, structured in five phases:

| Phase | Period | Activities |
|-------|--------|------------|
| **1. Problem definition and literature review** | Oct–Nov 2024 | Review of ITS, BKT, and CTAT literature; identification of research gap; formulation of objectives |
| **2. Dataset analysis and parameter estimation** | Nov–Dec 2024 | KDD Cup 2010 dataset preprocessing; KC mapping; cleaning version comparison; pyBKT model fitting and cross-validation |
| **3. System design and exercise authoring** | Dec 2024–Feb 2025 | Architecture definition; KC taxonomy and prerequisite structure; CTAT exercise generation (70 exercises); three-block algorithm design |
| **4. Implementation** | Feb–Apr 2025 | FastAPI backend; React frontend; multi-database SQLite architecture; SSE communication; report generation; Cloudflare deployment |
| **5. Evaluation and reporting** | Apr–May 2025 | Pilot study (pending); memoria writing; final system testing |

### Appendix G: AI Usage Declaration

This thesis was written by the author, Melany Nuria Condori Claros. An AI language model assistant (Claude, Anthropic) was used during the writing process for text refinement, structural suggestions, and drafting of specific sections of the memoria. All technical content, implementation decisions, system architecture, experimental design, exercise authoring, data analysis, and empirical results were produced entirely by the author. All AI-assisted text was reviewed, verified against the source code and data, and substantially revised by the author before inclusion. No AI tool was used to generate, modify, or analyse any code in the repository.
