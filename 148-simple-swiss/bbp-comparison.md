# BBP comparison for round 5

Engine: BBP Pairings v6.0.0. Source tag: v6.0.0.

Original input: `4.trf`. Pairing input: `4-bbp.trf`, with `XXR 11` and
zero-point absence records in round 5 for IDs 7, 9, 15, 19, 37, 44 and 45.
The original report and its scores are unchanged.

Run:

```powershell
.\bbpPairings.exe --dutch 4-bbp.trf -p bbp-pairings.txt -l bbp-checklist.txt
```

BBP uses pairing IDs by default, not current Elo. The 2.0 bracket's upper
half is Lundquist, Hartzell, Silins, Karlsson, Wahlberg, Adamsson.
This reproduces all six m14t pairs supplied in the conversation.

Controlled comparison: `4-bbp-elo.trf` has the same IDs, results, scores and
absences, but player rows sorted by descending current Elo and `rank` added
to `XXC white1`. The `rank` token makes BBP use row order as effective
pairing rank. The command-line `-r` only prints version information.

```powershell
.\bbpPairings.exe --dutch 4-bbp-elo.trf -p bbp-elo-pairings.txt -l bbp-elo-checklist.txt
```

Now the upper half is Silins, Hartzell, Lundquist, Karlsson, Wahlberg,
Adamsson. BBP produces Ring–Silins and Sahlin–Lundquist; the other four
pairs are unchanged. All six pairs and colors match the Python program's
2.0 bracket. This isolates the reported 4.04 difference to ordering for
this example, without requiring compilation or a change in BBP's weights.

Source references:

- https://github.com/BieremaBoyzProgramming/bbpPairings/blob/v6.0.0/src/fileformats/trf.cpp
  (`computePlayerIndexes`, `XXC rank`)
- https://github.com/BieremaBoyzProgramming/bbpPairings/blob/v6.0.0/src/swisssystems/dutch.cpp
  (`computeMatching`: sorting by accelerated score and effective rank)
