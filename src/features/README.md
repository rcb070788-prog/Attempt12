# Feature Modules

Feature-based organization for the Moore County Transparency Hub.

| Feature | Ownership | Components / Hooks |
|---------|-----------|--------------------|
| **auth** | Authentication & signup | useAuth, LoginPage, SignupPage |
| **finance** | Financial data, charts, dashboards | useFinanceData, CategoryDashboard, CountyRevenues, etc. |
| **social** | Polls, Board, Suggestions | useFeatures, useActions, PollsPage, BoardPage, SuggestionsPage |
| **admin** | Admin panel & sections | AdminPanel, admin/* sections |

Shared layout components (Navbar, Sidebar, Footer, MainView, Toast, etc.) remain in `src/components/`.
