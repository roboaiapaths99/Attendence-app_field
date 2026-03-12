import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import VisitPlanScreen from '../screens/VisitPlanScreen';
import ActiveVisitsScreen from '../screens/ActiveVisitsScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import PlanStatusScreen from '../screens/PlanStatusScreen';
import RouteMapScreen from '../screens/RouteMapScreen';
import EndDaySummaryScreen from '../screens/EndDaySummaryScreen';
import LeaveRequestScreen from '../screens/LeaveRequestScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OrganizationSelectionScreen from '../screens/OrganizationSelectionScreen';
import TeamPortalScreen from '../screens/TeamPortalScreen';
import LeaveDiscussionScreen from '../screens/LeaveDiscussionScreen';
import SyncQueueScreen from '../screens/SyncQueueScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ForceChangePasswordScreen from '../screens/ForceChangePasswordScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
    const { user, organization, loading } = useAuth();

    if (loading) return null;

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
                user.force_password_change ? (
                    <Stack.Screen name="ForceChangePassword" component={ForceChangePasswordScreen} />
                ) : (
                    <>
                        <Stack.Screen name="Dashboard" component={DashboardScreen} />
                        <Stack.Screen name="Attendance" component={AttendanceScreen} />
                        <Stack.Screen name="VisitPlan" component={VisitPlanScreen} />
                        <Stack.Screen name="PlanStatus" component={PlanStatusScreen} />
                        <Stack.Screen name="RouteMap" component={RouteMapScreen} />
                        <Stack.Screen name="ActiveVisits" component={ActiveVisitsScreen} />
                        <Stack.Screen name="Expenses" component={ExpensesScreen} />
                        <Stack.Screen name="LeaveRequest" component={LeaveRequestScreen} />
                        <Stack.Screen name="Profile" component={ProfileScreen} />
                        <Stack.Screen name="EndDaySummary" component={EndDaySummaryScreen} />
                        <Stack.Screen name="TeamPortal" component={TeamPortalScreen} />
                        <Stack.Screen name="LeaveDiscussion" component={LeaveDiscussionScreen} />
                        <Stack.Screen name="SyncQueue" component={SyncQueueScreen} />
                        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
                    </>
                )
            ) : !organization ? (
                <Stack.Screen name="OrganizationSelection" component={OrganizationSelectionScreen} />
            ) : (
                <Stack.Screen name="Login" component={LoginScreen} />
            )}
        </Stack.Navigator>
    );
}
