# The TA's 20-step test plan, run in order as one test. Later steps depend on earlier ones
# (the TA checks in units the first user checked out), so this can't be split into separate tests.
# A failure message names the step the TA would hit. The per-rule tests live in
# test_auth.py, test_projects.py and test_hardware.py.


def test_ta_walkthrough(api, hardware):
    # 1-3: accounts
    assert api.sign_up("abdon1", "password1").status_code == 201, "1. sign up"
    assert api.login("abdon1", "password1").status_code == 200, "2. sign in"
    assert api.login("abdon1", "wrongpass").status_code == 401, "3. wrong password"

    # 4-6: projects
    assert api.create_project("abdon1", "PROJ1234").status_code == 200, "4. create project"
    assert api.create_project("abdon1", "PROJ1234").status_code == 409, "5. duplicate project ID"
    api.sign_up("helper1", "password1")
    api.create_project("helper1", "PROJ5678")
    assert api.join_project("abdon1", "PROJ5678").status_code == 200, "6. join existing project"

    # 7-10: check out
    assert api.check_out("HWSet1", 10, "abdon1", "PROJ1234").status_code == 200, "7. check out HWSet1"
    assert api.check_out("HWSet2", 20, "abdon1", "PROJ1234").status_code == 200, "8. check out HWSet2"
    assert api.available("HWSet1") == 90, "9. HWSet1 reduced"
    assert api.available("HWSet2") == 80, "9. HWSet2 reduced"
    assert api.check_out("HWSet1", 91, "abdon1", "PROJ1234").status_code == 409, "10. more than available"
    assert api.available("HWSet1") == 90, "10. refused check-out changed nothing"

    # 11-12: check in
    assert api.check_in("HWSet1", 1, "abdon1", "PROJ1234").status_code == 200, "11. check in HWSet1"
    assert api.available("HWSet1") == 91, "12. HWSet1 increased"

    # 13-14: log off is frontend-only (the backend keeps no session), so "state persists"
    # means a fresh login sees the same projects and counts
    assert api.login("abdon1", "password1").status_code == 200, "14. log in again"
    assert sorted(api.projects_of("abdon1")) == ["PROJ1234", "PROJ5678"], "14. projects persist"
    assert api.available("HWSet1") == 91, "14. HWSet1 count persists"
    assert api.available("HWSet2") == 80, "14. HWSet2 count persists"

    # 15-17: second user (the TA)
    assert api.sign_up("tauser1", "password1").status_code == 201, "15. TA signs up"
    assert api.login("tauser1", "password1").status_code == 200, "15. TA logs in"
    assert api.create_project("tauser1", "PROJ1234").status_code == 409, "16. TA reuses project ID"
    assert api.check_out("HWSet1", 1, "tauser1", "PROJ1234").status_code == 403, "17. non-member refused"
    assert api.join_project("tauser1", "PROJ1234").status_code == 200, "17. TA joins project"

    # 18-19: TA checks in what the first user checked out
    assert api.check_in("HWSet2", 5, "tauser1", "PROJ1234").status_code == 200, "18. TA checks in HWSet2"
    assert api.available("HWSet2") == 85, "19. HWSet2 increased"

    # 20
    assert api.check_out("HWSet1", 3, "tauser1", "PROJ1234").status_code == 200, "20. TA checks out"
    assert api.available("HWSet1") == 88, "20. HWSet1 reduced"
