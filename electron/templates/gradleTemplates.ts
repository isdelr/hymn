/**
 * Generate settings.gradle content.
 */
export function generateSettingsGradle(projectName: string): string {
  return `rootProject.name = '${projectName}'
`
}

/**
 * Generate gradle.properties content.
 */
export function generateGradleProperties(options: {
  version: string
  group: string
  javaVersion: number
  includesAssetPack: boolean
  patchline: string
}): string {
  return `# The current version of your project. Please use semantic versioning!
version=${options.version}

# The group ID used for maven publishing. Usually the same as your package name
# but not the same as your plugin group!
maven_group=${options.group}

# The version of Java used by your plugin. The game is built on Java 21 but
# actually runs on Java 25.
java_version=${options.javaVersion}

# Determines if your plugin should also be loaded as an asset pack. If your
# pack contains assets, or you intend to use the in-game asset editor, you
# want this to be true.
includes_pack=${options.includesAssetPack}

# The release channel your plugin should be built and ran against. This is
# usually release or pre-release. You can verify your settings in the
# official launcher.
patchline=${options.patchline}

# Determines if the development server should also load mods from the user's
# standard mods folder. This lets you test mods by installing them where a
# normal player would, instead of adding them as dependencies or adding them
# to the development server manually.
load_user_mods=false

# If Hytale was installed to a custom location, you must set the home path
# manually. You may also want to use a custom path if you are building in
# a non-standard environment like a build server. The home path should
# the folder that contains the install and UserData folder.
# hytale_home=./test-file
`
}

/**
 * Generate build.gradle content.
 */
export function generateBuildGradle(): string {
  return `plugins {
    id 'java'
    id 'idea'
}

import org.gradle.internal.os.OperatingSystem

group = project.maven_group
version = project.version

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(project.java_version as int)
    }
}

repositories {
    mavenCentral()
}

// Locate Hytale installation
ext {
    if (project.hasProperty('hytale_home') && project.hytale_home?.trim()) {
        hytaleHome = project.hytale_home
    } else {
        def os = OperatingSystem.current()
        if (os.isWindows()) {
            hytaleHome = System.getProperty('user.home') + '/AppData/Roaming/Hytale'
        } else if (os.isMacOsX()) {
            hytaleHome = System.getProperty('user.home') + '/Library/Application Support/Hytale'
        } else if (os.isLinux()) {
            def flatpakPath = System.getProperty('user.home') + '/.var/app/com.hypixel.HytaleLauncher/data/Hytale'
            if (file(flatpakPath).exists()) {
                hytaleHome = flatpakPath
            } else {
                hytaleHome = System.getProperty('user.home') + '/.local/share/Hytale'
            }
        }
    }
}

if (!project.hasProperty('hytaleHome') || !file(hytaleHome).exists()) {
    throw new GradleException('Your Hytale install could not be detected automatically. Please set hytale_home in gradle.properties.')
}

def patchline = project.hasProperty('patchline') ? project.patchline : 'release'
def hytaleServer = file("\${hytaleHome}/install/\${patchline}/package/game/latest/Server/HytaleServer.jar")

if (!hytaleServer.exists()) {
    throw new GradleException("Could not find HytaleServer.jar at: \${hytaleServer}. Make sure Hytale is installed and run at least once.")
}

dependencies {
    compileOnly files(hytaleServer)
}

// Update manifest.json with version and includes_pack from gradle.properties
tasks.register('updatePluginManifest') {
    def manifestFile = file('src/main/resources/manifest.json')
    doLast {
        if (manifestFile.exists()) {
            def manifest = new groovy.json.JsonSlurper().parse(manifestFile)
            manifest.Version = project.version
            manifest.IncludesAssetPack = project.includes_pack.toBoolean()
            manifestFile.text = groovy.json.JsonOutput.prettyPrint(groovy.json.JsonOutput.toJson(manifest))
        }
    }
}

tasks.named('processResources') {
    dependsOn 'updatePluginManifest'
}

// Build JAR
tasks.named('jar') {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    from('src/main/resources') {
        include '**/*'
    }
    archiveBaseName = project.name
    archiveVersion = project.version
    destinationDirectory = file("\${buildDir}/libs")
}

// IntelliJ IDEA run configuration
idea {
    module {
        inheritOutputDirs = true
    }
}

tasks.register('generateIdeaRunConfig') {
    def runDir = file("\${projectDir}/run")
    def configDir = file("\${projectDir}/.idea/runConfigurations")

    doLast {
        configDir.mkdirs()
        def loadUserMods = project.hasProperty('load_user_mods') && project.load_user_mods.toBoolean()
        def userDataMods = loadUserMods ? "\${hytaleHome}/UserData/Mods" : ''

        def configXml = """<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="Run Hytale Server" type="Application" factoryName="Application">
    <option name="MAIN_CLASS_NAME" value="com.hypixel.hytale.server.HytaleServer" />
    <module name="\${project.name}.main" />
    <option name="PROGRAM_PARAMETERS" value="--mod-paths=&quot;\${projectDir}/build/libs&quot;\${loadUserMods ? ",&quot;\${userDataMods}&quot;" : ''} --asset-paths=&quot;\${projectDir}/src/main/resources&quot;" />
    <option name="WORKING_DIRECTORY" value="\${runDir}" />
    <classpath>
      <root path="\${hytaleServer}" type="path" />
    </classpath>
  </configuration>
</component>"""
        file("\${configDir}/Run_Hytale_Server.xml").text = configXml
    }
}

// VS Code launch configuration
tasks.register('generateVSCodeLaunch') {
    def vscodeDir = file("\${projectDir}/.vscode")

    doLast {
        vscodeDir.mkdirs()
        def loadUserMods = project.hasProperty('load_user_mods') && project.load_user_mods.toBoolean()
        def userDataMods = loadUserMods ? ",\${hytaleHome}/UserData/Mods" : ''

        def launchJson = """{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "java",
            "name": "Run Hytale Server",
            "request": "launch",
            "mainClass": "com.hypixel.hytale.server.HytaleServer",
            "classPaths": ["\${hytaleServer}"],
            "args": "--mod-paths=\\"\${projectDir}/build/libs\\"\${loadUserMods ? ",\\"\${userDataMods}\\"" : ''} --asset-paths=\\"\${projectDir}/src/main/resources\\"",
            "cwd": "\${projectDir}/run"
        }
    ]
}"""
        file("\${vscodeDir}/launch.json").text = launchJson
    }
}
`
}

/**
 * Generate .gitignore content.
 */
export function generateGitignore(): string {
  return `### Gradle ###
.gradle
build/
!gradle/wrapper/gradle-wrapper.jar
!**/src/main/**/build/
!**/src/test/**/build/

### Hytale ###
run/

### IntelliJ IDEA ###
.idea/
*.iws
*.iml
*.ipr
out/
!**/src/main/**/out/
!**/src/test/**/out/

### Eclipse ###
.apt_generated
.classpath
.factorypath
.project
.settings
.springBeans
.sts4-cache
bin/
!**/src/main/**/bin/
!**/src/test/**/bin/

### NetBeans ###
/nbproject/private/
/nbbuild/
/dist/
/nbdist/
/.nb-gradle/

### VS Code ###
.vscode/

### Mac OS ###
.DS_Store
`
}

/**
 * Generate gradlew (Unix shell script).
 */
export function generateGradlew(): string {
  return `#!/bin/sh

#
# Copyright 2015-2021 the original authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

##############################################################################
##
##  Gradle start up script for UN*X
##
##############################################################################

# Attempt to set APP_HOME
# Resolve links: $0 may be a link
PRG="$0"
while [ -h "$PRG" ] ; do
    ls=\`ls -ld "$PRG"\`
    link=\`expr "$ls" : '.*-> \\(.*\\)$'\`
    if expr "$link" : '/.*' > /dev/null; then
        PRG="$link"
    else
        PRG=\`dirname "$PRG"\`"/$link"
    fi
done
SAVED="\`pwd\`"
cd "\`dirname \\"$PRG\\"\`/" >/dev/null
APP_HOME="\`pwd -P\`"
cd "$SAVED" >/dev/null

APP_NAME="Gradle"
APP_BASE_NAME=\`basename "$0"\`

# Add default JVM options here.
DEFAULT_JVM_OPTS='"-Xmx64m" "-Xms64m"'

# Use the maximum available, or set MAX_FD != -1 to use that value.
MAX_FD="maximum"

warn () {
    echo "$*"
}

die () {
    echo
    echo "$*"
    echo
    exit 1
}

# OS specific support
cygwin=false
msys=false
darwin=false
nonstop=false
case "\`uname\`" in
  CYGWIN* )
    cygwin=true
    ;;
  Darwin* )
    darwin=true
    ;;
  MSYS* | MINGW* )
    msys=true
    ;;
  NONSTOP* )
    nonstop=true
    ;;
esac

CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar

# Determine the Java command to use to start the JVM.
if [ -n "$JAVA_HOME" ] ; then
    if [ -x "$JAVA_HOME/jre/sh/java" ] ; then
        JAVACMD="$JAVA_HOME/jre/sh/java"
    else
        JAVACMD="$JAVA_HOME/bin/java"
    fi
    if [ ! -x "$JAVACMD" ] ; then
        die "ERROR: JAVA_HOME is set to an invalid directory: $JAVA_HOME"
    fi
else
    JAVACMD="java"
    which java >/dev/null 2>&1 || die "ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH."
fi

# Increase the maximum file descriptors if we can.
if [ "$cygwin" = "false" ] && [ "$darwin" = "false" ] && [ "$nonstop" = "false" ] ; then
    MAX_FD_LIMIT=\`ulimit -H -n\`
    if [ $? -eq 0 ] ; then
        if [ "$MAX_FD" = "maximum" ] || [ "$MAX_FD" = "max" ] ; then
            MAX_FD="$MAX_FD_LIMIT"
        fi
        ulimit -n $MAX_FD
        if [ $? -ne 0 ] ; then
            warn "Could not set maximum file descriptor limit: $MAX_FD"
        fi
    else
        warn "Could not query maximum file descriptor limit: $MAX_FD_LIMIT"
    fi
fi

# For Cygwin or MSYS, switch paths to Windows format before running java
if [ "$cygwin" = "true" ] || [ "$msys" = "true" ] ; then
    APP_HOME=\`cygpath --path --mixed "$APP_HOME"\`
    CLASSPATH=\`cygpath --path --mixed "$CLASSPATH"\`
    JAVACMD=\`cygpath --unix "$JAVACMD"\`
fi

# Collect all arguments for the java command;
#   * DEFAULT_JVM_OPTS, JAVA_OPTS, and GRADLE_OPTS environment variables
#   * Command line arguments
eval set -- $DEFAULT_JVM_OPTS $JAVA_OPTS $GRADLE_OPTS "\\"-Dorg.gradle.appname=$APP_BASE_NAME\\"" -classpath "\\"$CLASSPATH\\"" org.gradle.wrapper.GradleWrapperMain "$@"

exec "$JAVACMD" "$@"
`
}

/**
 * Generate gradlew.bat (Windows batch script).
 */
export function generateGradlewBat(): string {
  return `@rem
@rem Copyright 2015-2021 the original authors.
@rem
@rem Licensed under the Apache License, Version 2.0 (the "License");
@rem you may not use this file except in compliance with the License.
@rem You may obtain a copy of the License at
@rem
@rem      https://www.apache.org/licenses/LICENSE-2.0
@rem
@rem Unless required by applicable law or agreed to in writing, software
@rem distributed under the License is distributed on an "AS IS" BASIS,
@rem WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
@rem See the License for the specific language governing permissions and
@rem limitations under the License.
@rem

@if "%DEBUG%" == "" @echo off
@rem ##########################################################################
@rem
@rem  Gradle startup script for Windows
@rem
@rem ##########################################################################

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@rem Add default JVM options here.
set DEFAULT_JVM_OPTS="-Xmx64m" "-Xms64m"

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if "%ERRORLEVEL%" == "0" goto execute

echo.
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto execute

echo.
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:execute
@rem Setup the command line

set CLASSPATH=%APP_HOME%\\gradle\\wrapper\\gradle-wrapper.jar


@rem Execute Gradle
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %GRADLE_OPTS% "-Dorg.gradle.appname=%APP_BASE_NAME%" -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*

:end
@rem End local scope for the variables with windows NT shell
if "%ERRORLEVEL%"=="0" goto mainEnd

:fail
rem Set variable GRADLE_EXIT_CONSOLE if you need the _script_ return code instead of
rem having the terminal window close on error.
if  not "" == "%GRADLE_EXIT_CONSOLE%" exit 1
exit /b 1

:mainEnd
if "%OS%"=="Windows_NT" endlocal

:omega
`
}

/**
 * Generate gradle-wrapper.properties content.
 */
export function generateGradleWrapperProperties(gradleVersion: string): string {
  return `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-${gradleVersion}-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`
}

/**
 * Generate the main Java class for a plugin.
 */
export function generateMainJavaClass(options: {
  packageName: string
  className: string
  pluginName: string
}): string {
  return `package ${options.packageName};

import com.hypixel.hytale.logger.HytaleLogger;
import com.hypixel.hytale.server.core.event.events.player.PlayerConnectEvent;
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;

import javax.annotation.Nonnull;

/**
 * Main entry point for the ${options.pluginName} plugin.
 * Use the setup method to register commands, event listeners, and other game hooks.
 */
public class ${options.className} extends JavaPlugin {

    private static final HytaleLogger LOGGER = HytaleLogger.forEnclosingClass();

    public ${options.className}(@Nonnull JavaPluginInit init) {
        super(init);
        LOGGER.atInfo().log("${options.pluginName} v" + this.getManifest().getVersion().toString() + " loaded!");
    }

    @Override
    protected void setup() {
        LOGGER.atInfo().log("Setting up ${options.pluginName}...");

        // Register your commands here:
        // this.getCommandRegistry().registerCommand(new MyCommand());

        // Register event listeners here:
        // this.getEventRegistry().register(PlayerConnectEvent.class, event -> { });
    }
}
`
}
