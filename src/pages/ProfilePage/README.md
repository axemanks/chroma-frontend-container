# Profile Page

A clean and modern user profile page for the Blue Edge Collections API Portal.

## Features

### User Information Display

- **User Avatar**: Displays user's avatar with name initials
- **Authentication Status**: Shows "Authenticated" badge
- **User Details**: Name, email, tenant ID, and user ID
- **Last Login**: Shows when the user last logged in
- **Roles & Groups**: Displays user roles and group memberships (if available)

### System Information

- **Function App Instance**: Shows the current Azure Function App instance
- **Application Version**: Displays the current version of the portal

### User Interface

- **Responsive Design**: Cards are displayed side by side on larger screens, stacked on mobile
- **Back Navigation**: Back button in the header to return to the previous page
- **Card Layout**: Main profile card (left/top) and system information card (right/bottom)
- **Fluent UI Design**: Consistent with the rest of the application
- **Icon Integration**: Uses Fluent UI icons for visual clarity

## Technical Details

### Components Used

- Fluent UI React components (Card, Avatar, Badge, etc.)
- Azure MSAL for user authentication data
- React Router for navigation

### Styling

- Uses Fluent UI's design tokens for consistent theming
- Responsive grid layout for information cards
- Modern card-based design with proper spacing and typography

### Data Sources

- User information from Azure MSAL authentication
- System information from application configuration
- Version information from the build system

## Future Enhancements

- Edit profile functionality (currently shows as "Coming Soon")
- Additional user preferences
- Activity history
- Security settings

## Navigation

The profile page is accessible via the user menu in the top-right corner of the application header.
