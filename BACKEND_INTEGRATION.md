# Backend Integration Guide

## Project Overview

This NestJS backend provides a complete animal rescue platform with:
- User authentication (Citizen/NGO roles)
- Case reporting with image uploads
- Geo-location based case discovery
- NGO case management
- Animal adoption listings

**Base URLs:**
- **Local Development**: `http://localhost:3000`
- **Android Emulator**: `http://10.0.2.2:3000`
- **Web**: `http://localhost:3000`

## Authentication Flow

### 1. User Registration
Users register with a fixed role that cannot be changed later:
- `Citizen`: Can report cases and view listings
- `NGO`: Can respond to cases and manage operations

### 2. Login & JWT Token
After login, receive a JWT access token with payload:
```json
{
  "userId": "uuid-string",
  "role": "Citizen" | "NGO"
}
```

### 3. Token Usage
Include JWT in all protected requests:
```
Authorization: Bearer <jwt-token>
```

## User Roles & Access Rules

| Endpoint | Citizen | NGO | Notes |
|----------|---------|-----|-------|
| POST /auth/signup | ✅ | ✅ | Role fixed at signup |
| POST /auth/login | ✅ | ✅ | |
| GET /cases | ✅ | ✅ | |
| GET /cases/:id | ✅ | ✅ | |
| POST /cases | ✅ | ❌ | Requires image upload |
| PUT /cases/:id | ✅ | ❌ | Only case creator |
| PATCH /cases/:id/status | ❌ | ✅ | NGO only, assigns NGO |
| GET /ngo/nearby-cases | ❌ | ✅ | NGO only |
| GET /adoptions | ✅ | ✅ | |
| POST /adoptions | ✅ | ❌ | Adoption cases only |

## API Endpoints

### Authentication

#### POST /auth/signup
Create a new user account.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "Citizen" | "NGO",
  "phone": "string" // Required only for NGO
}
```

**Response:**
```json
{
  "access_token": "jwt-string",
  "token": "jwt-string" // Duplicate for compatibility
}
```

**Errors:**
- `400`: Validation error, missing required fields
- `409`: Email already exists

#### POST /auth/login
Authenticate user and receive JWT.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access_token": "jwt-string",
  "token": "jwt-string"
}
```

**Errors:**
- `401`: Invalid credentials

### Cases

#### GET /cases
List all non-adoption cases.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "string",
    "description": "string",
    "type": "INJURED" | "NEWBORN" | "EMERGENCY",
    "severity": "Critical" | "Urgent" | "Moderate" | "Low",
    "status": "Reported" | "InProgress" | "Resolved" | "Closed",
    "latitude": number,
    "longitude": number,
    "imageUrl": "string",
    "createdAt": "datetime",
    "reportedBy": {
      "id": "uuid",
      "name": "string",
      "email": "string"
    },
    "assignedNgo": {
      "id": "uuid",
      "name": "string",
      "email": "string"
    } | null
  }
]
```

#### GET /cases/:id
Get specific case details.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:** Same structure as single item in cases list.

**Errors:**
- `404`: Case not found

#### POST /cases
Create a new case with image upload.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Request Body (Form-Data):**
```
image: File (required)
title: string (required)
description: string (required)
type: "INJURED" | "NEWBORN" | "EMERGENCY" (required)
severity: "Critical" | "Urgent" | "Moderate" | "Low" (required)
latitude: number (required)
longitude: number (required)
```

**Response:** Complete case object with `imageUrl` populated.

**Errors:**
- `400`: Missing required fields or invalid image
- `401`: Unauthorized

#### PUT /cases/:id
Update case details (creator only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "severity": "Critical" | "Urgent" | "Moderate" | "Low"
}
```

**Response:** Updated case object.

**Errors:**
- `401`: Unauthorized
- `403`: Not case creator
- `404`: Case not found

#### PATCH /cases/:id/status
NGO responds to case (NGO only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "InProgress"
}
```

**Response:** Updated case with `assignedNgo` set to current NGO.

**Errors:**
- `401`: Unauthorized
- `403`: Not NGO role
- `404`: Case not found

### NGO Operations

#### GET /ngo/nearby-cases
Find cases within 5km radius (NGO only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
```
lat: number (required)
lng: number (required)
```

**Response:** Array of cases sorted by severity then distance.

**Errors:**
- `401`: Unauthorized
- `403`: Not NGO role

### Adoptions

#### GET /adoptions
List adoption cases only.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:** Array of cases with `type: "ADOPTION"` and `severity: null`.

#### POST /adoptions
Create adoption case with image.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Request Body (Form-Data):**
```
image: File (required)
title: string (required)
description: string (required)
latitude: number (required)
longitude: number (required)
```

**Response:** Adoption case object.

**Note:** Automatically sets `type: "ADOPTION"` and `severity: null`.

## Multipart Image Upload Guide

### Flutter Implementation

#### Mobile (File from Gallery/Camera)
```dart
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';

Future<void> createCaseWithImage() async {
  final picker = ImagePicker();
  final image = await picker.pickImage(source: ImageSource.gallery);
  
  if (image != null) {
    final dio = Dio();
    final formData = FormData.fromMap({
      'image': await MultipartFile.fromFile(image.path),
      'title': 'Injured Animal',
      'description': 'Found on street',
      'type': 'INJURED',
      'severity': 'Critical',
      'latitude': 40.7128,
      'longitude': -74.0060,
    });
    
    try {
      final response = await dio.post(
        'http://localhost:3000/cases',
        data: formData,
        options: Options(
          headers: {
            'Authorization': 'Bearer $jwtToken',
            'Content-Type': 'multipart/form-data',
          },
        ),
      );
      print('Case created: ${response.data}');
    } catch (e) {
      print('Error: $e');
    }
  }
}
```

#### Web (File from Web Picker)
```dart
Future<void> createCaseWeb() async {
  final input = html.FileUploadInputElement();
  input.accept = 'image/*';
  input.click();
  
  input.onChange.listen((e) async {
    final file = input.files!.first;
    final reader = html.FileReader();
    reader.readAsArrayBuffer(file);
    
    reader.onLoadEnd.listen((e) async {
      final bytes = reader.result as List<int>;
      final dio = Dio();
      
      final formData = FormData.fromMap({
        'image': MultipartFile.fromBytes(
          bytes,
          filename: file.name,
        ),
        'title': 'Adoption Case',
        'description': 'Friendly cat',
        'latitude': 40.7128,
        'longitude': -74.0060,
      });
      
      final response = await dio.post(
        'http://localhost:3000/adoptions',
        data: formData,
        options: Options(
          headers: {
            'Authorization': 'Bearer $jwtToken',
          },
        ),
      );
    });
  });
}
```

## JWT Token Handling

### Dio Interceptor Example
```dart
class AuthInterceptor extends Interceptor {
  final String token;

  AuthInterceptor(this.token);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Handle token expiration - redirect to login
      // Clear local storage, navigate to login screen
    }
    handler.next(err);
  }
}

// Usage
final dio = Dio();
dio.interceptors.add(AuthInterceptor(jwtToken));
```

### Token Storage
```dart
// SharedPreferences for mobile
await prefs.setString('jwt_token', token);

// localStorage for web
html.window.localStorage['jwt_token'] = token;
```

## Location & Geo Queries

### Nearby Cases Algorithm
The backend uses Haversine distance calculation:
- **Radius**: 5km maximum
- **Sorting**: Severity (Critical → Low) then distance
- **Required**: NGO role + lat/lng query params

### Flutter Location Integration
```dart
import 'package:geolocator/geolocator.dart';

Future<void> getNearbyCases() async {
  final position = await Geolocator.getCurrentPosition();
  
  final response = await dio.get(
    'http://localhost:3000/ngo/nearby-cases',
    queryParameters: {
      'lat': position.latitude,
      'lng': position.longitude,
    },
    options: Options(
      headers: {'Authorization': 'Bearer $jwtToken'},
    ),
  );
  
  final cases = response.data;
  // Cases already sorted by severity and distance
}
```

## NGO Response Flow

1. **NGO discovers cases** via `/ngo/nearby-cases`
2. **NGO accepts case** via `PATCH /cases/:id/status`
3. **Backend assigns NGO** and sets status to `InProgress`
4. **Case appears in general list** with assigned NGO

## Adoption Flow

1. **User creates adoption** via `POST /adoptions` with image
2. **Case type automatically set** to `ADOPTION`, severity `null`
3. **List adoptions** via `GET /adoptions` (filtered by type)
4. **No NGO response** needed for adoptions

## Bookmarks (Client-side Only)

Bookmarks are **not implemented** on the backend. Handle client-side:

```dart
// SharedPreferences example
Future<void> toggleBookmark(String caseId) async {
  final prefs = await SharedPreferences.getInstance();
  final bookmarks = prefs.getStringList('bookmarks') ?? [];
  
  if (bookmarks.contains(caseId)) {
    bookmarks.remove(caseId);
  } else {
    bookmarks.add(caseId);
  }
  
  await prefs.setStringList('bookmarks', bookmarks);
}

Future<bool> isBookmarked(String caseId) async {
  final prefs = await SharedPreferences.getInstance();
  final bookmarks = prefs.getStringList('bookmarks') ?? [];
  return bookmarks.contains(caseId);
}
```

## Error Codes & Handling

| Status Code | Meaning | Action |
|-------------|---------|--------|
| 200 | Success | Process response |
| 400 | Bad Request | Show validation error |
| 401 | Unauthorized | Redirect to login |
| 403 | Forbidden | Show permission error |
| 404 | Not Found | Show not found error |
| 409 | Conflict | Show email exists error |

### Global Error Handler
```dart
class ApiError {
  final int statusCode;
  final String message;

  ApiError(this.statusCode, this.message);

  static ApiError fromResponse(Response response) {
    return ApiError(
      response.statusCode ?? 0,
      response.data['message'] ?? 'Unknown error',
    );
  }

  String get userMessage {
    switch (statusCode) {
      case 401:
        return 'Please login to continue';
      case 403:
        return 'You don\'t have permission for this action';
      case 404:
        return 'Resource not found';
      case 400:
        return message;
      default:
        return 'Something went wrong';
    }
  }
}
```

## Environment Variables Required

Backend requires these environment variables (handled by backend team):

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Common Integration Pitfalls

1. **Wrong Base URL**: Use `10.0.2.2:3000` for Android emulator
2. **Missing JWT**: All endpoints except auth require `Authorization: Bearer <token>`
3. **Role Violations**: Citizens can't access NGO-only endpoints
4. **Multipart Issues**: Use `FormData.fromMap()` for image uploads
5. **Token Expiration**: Handle 401 responses globally
6. **CORS Issues**: Backend allows all origins in development

## Testing Checklist

### Authentication
- [ ] Create Citizen account
- [ ] Create NGO account (with phone)
- [ ] Login both account types
- [ ] Verify JWT token structure

### Cases
- [ ] Create case with image (Citizen)
- [ ] List all cases
- [ ] Get specific case
- [ ] Update own case (Citizen)
- [ ] Try updating other's case (should fail)

### NGO Operations
- [ ] Get nearby cases with lat/lng (NGO)
- [ ] Try nearby cases as Citizen (should fail)
- [ ] Respond to case via status patch (NGO)
- [ ] Verify NGO assignment in response

### Adoptions
- [ ] Create adoption case (Citizen)
- [ ] List adoptions
- [ ] Verify type=ADOPTION and severity=null

### Error Handling
- [ ] Test without JWT (401)
- [ ] Test wrong role (403)
- [ ] Test invalid data (400)
- [ ] Test missing fields (400)

### Image Upload
- [ ] Upload from mobile gallery
- [ ] Upload from web file picker
- [ ] Verify Cloudinary URL in response

## Flutter Setup

Add these dependencies to `pubspec.yaml`:

```yaml
dependencies:
  dio: ^5.3.2
  image_picker: ^1.0.4
  geolocator: ^10.1.0
  shared_preferences: ^2.2.2
```

This guide provides everything needed for complete Flutter integration with the NestJS backend.
